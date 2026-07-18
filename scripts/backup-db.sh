#!/usr/bin/env bash
set -euo pipefail

# Sauvegarde PostgreSQL automatisée (ITEM-056) : dump compressé envoyé vers le
# stockage S3-compatible déjà configuré pour l'app (S3_ENDPOINT/S3_BUCKET,
# ITEM-027 — MinIO en local, S3/R2 en production), avec purge des sauvegardes
# plus vieilles que la rétention configurée.
#
# Prérequis (sur la machine/l'image qui exécute ce script, pas une dépendance
# Node du projet) : `pg_dump` (client PostgreSQL) et `aws` (AWS CLI v2) sur le
# PATH.
#
# Variables d'environnement requises : DATABASE_URL, S3_BUCKET,
# S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
# Optionnelles : S3_ENDPOINT (MinIO/R2 — absent = AWS S3 standard), S3_REGION
# (défaut "auto"), BACKUP_PREFIX (défaut "backups/postgres"),
# BACKUP_RETENTION_DAYS (défaut 30).
#
# Usage : ./scripts/backup-db.sh
# Planification (cron, exemple quotidien à 3h) :
#   0 3 * * * cd /app && ./scripts/backup-db.sh >> /var/log/backup-db.log 2>&1
#
# Restauration : voir ./scripts/restore-db.sh (contrepartie de ce script).

for bin in pg_dump aws; do
  command -v "$bin" >/dev/null 2>&1 || {
    echo "[backup-db] Erreur : '$bin' est requis mais introuvable sur le PATH." >&2
    exit 1
  }
done

: "${DATABASE_URL:?[backup-db] Variable DATABASE_URL requise.}"
: "${S3_BUCKET:?[backup-db] Variable S3_BUCKET requise.}"
: "${S3_ACCESS_KEY_ID:?[backup-db] Variable S3_ACCESS_KEY_ID requise.}"
: "${S3_SECRET_ACCESS_KEY:?[backup-db] Variable S3_SECRET_ACCESS_KEY requise.}"

BACKUP_PREFIX="${BACKUP_PREFIX:-backups/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Format triable lexicographiquement comme chronologiquement (ISO 8601 compact)
# — permet de comparer les sauvegardes à une date de coupure par simple
# comparaison de chaînes, sans reparser les dates S3 (`LastModified`) qui
# varient de format selon l'implémentation (AWS S3 vs MinIO vs R2).
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="$(mktemp -t db-backup-XXXXXX).sql.gz"
S3_KEY="${BACKUP_PREFIX}/${TIMESTAMP}.sql.gz"

export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"

ENDPOINT_ARGS=()
if [ -n "${S3_ENDPOINT:-}" ]; then
  ENDPOINT_ARGS=(--endpoint-url "$S3_ENDPOINT")
fi

cleanup() {
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

echo "[backup-db] Dump de la base vers ${DUMP_FILE}…"
# --no-owner/--no-privileges : dump portable, restaurable sur une instance dont
# les rôles PostgreSQL ne correspondent pas exactement (ex. restauration locale
# de test) sans échouer sur des `ALTER OWNER`/`GRANT` impossibles à honorer.
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$DUMP_FILE"

echo "[backup-db] Envoi vers s3://${S3_BUCKET}/${S3_KEY}…"
aws s3 cp "$DUMP_FILE" "s3://${S3_BUCKET}/${S3_KEY}" "${ENDPOINT_ARGS[@]}"

echo "[backup-db] Purge des sauvegardes de plus de ${BACKUP_RETENTION_DAYS} jour(s)…"
if date -u -d "-${BACKUP_RETENTION_DAYS} days" +%Y%m%dT%H%M%SZ >/dev/null 2>&1; then
  CUTOFF="$(date -u -d "-${BACKUP_RETENTION_DAYS} days" +%Y%m%dT%H%M%SZ)" # GNU date (Linux, images de déploiement)
else
  CUTOFF="$(date -u -v-"${BACKUP_RETENTION_DAYS}"d +%Y%m%dT%H%M%SZ)" # BSD date (macOS, développement local)
fi

aws s3 ls "s3://${S3_BUCKET}/${BACKUP_PREFIX}/" "${ENDPOINT_ARGS[@]}" | awk '{print $4}' | while read -r filename; do
  [ -z "$filename" ] && continue
  file_ts="${filename%.sql.gz}"
  if [[ "$file_ts" < "$CUTOFF" ]]; then
    echo "[backup-db] Suppression de la sauvegarde expirée : ${BACKUP_PREFIX}/${filename}"
    aws s3 rm "s3://${S3_BUCKET}/${BACKUP_PREFIX}/${filename}" "${ENDPOINT_ARGS[@]}"
  fi
done

echo "[backup-db] Terminé : s3://${S3_BUCKET}/${S3_KEY}"
