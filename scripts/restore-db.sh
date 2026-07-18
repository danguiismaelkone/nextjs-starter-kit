#!/usr/bin/env bash
set -euo pipefail

# Restauration PostgreSQL depuis une sauvegarde S3 (ITEM-056) — contrepartie de
# ./scripts/backup-db.sh. Procédure documentée dans README.md (« Sauvegardes et
# restauration »).
#
# ATTENTION : écrase le contenu de la base ciblée par DATABASE_URL. Action
# manuelle et explicite uniquement — jamais planifiée/automatique.
#
# Prérequis : `psql` (client PostgreSQL) et `aws` (AWS CLI v2) sur le PATH.
# Variables d'environnement requises : DATABASE_URL, S3_BUCKET,
# S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
# Optionnelles : S3_ENDPOINT (MinIO/R2), S3_REGION (défaut "auto"),
# BACKUP_PREFIX (défaut "backups/postgres").
#
# Usage :
#   ./scripts/restore-db.sh <clé-s3>     # ex. backups/postgres/20260716T030000Z.sql.gz
#   ./scripts/restore-db.sh --latest     # restaure la sauvegarde la plus récente

for bin in psql aws; do
  command -v "$bin" >/dev/null 2>&1 || {
    echo "[restore-db] Erreur : '$bin' est requis mais introuvable sur le PATH." >&2
    exit 1
  }
done

: "${DATABASE_URL:?[restore-db] Variable DATABASE_URL requise.}"
: "${S3_BUCKET:?[restore-db] Variable S3_BUCKET requise.}"
: "${S3_ACCESS_KEY_ID:?[restore-db] Variable S3_ACCESS_KEY_ID requise.}"
: "${S3_SECRET_ACCESS_KEY:?[restore-db] Variable S3_SECRET_ACCESS_KEY requise.}"

BACKUP_PREFIX="${BACKUP_PREFIX:-backups/postgres}"

export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"

ENDPOINT_ARGS=()
if [ -n "${S3_ENDPOINT:-}" ]; then
  ENDPOINT_ARGS=(--endpoint-url "$S3_ENDPOINT")
fi

if [ "${1:-}" = "--latest" ]; then
  LATEST_FILE="$(aws s3 ls "s3://${S3_BUCKET}/${BACKUP_PREFIX}/" "${ENDPOINT_ARGS[@]}" | awk '{print $4}' | sort | tail -n1)"
  if [ -z "$LATEST_FILE" ]; then
    echo "[restore-db] Erreur : aucune sauvegarde trouvée sous s3://${S3_BUCKET}/${BACKUP_PREFIX}/." >&2
    exit 1
  fi
  S3_KEY="${BACKUP_PREFIX}/${LATEST_FILE}"
elif [ -n "${1:-}" ]; then
  S3_KEY="$1"
else
  echo "Usage : $0 <clé-s3> | --latest" >&2
  exit 1
fi

echo "[restore-db] Cette opération va ÉCRASER la base ciblée par DATABASE_URL avec : s3://${S3_BUCKET}/${S3_KEY}"
read -r -p "[restore-db] Confirmer (taper 'restore' pour continuer) : " CONFIRMATION
if [ "$CONFIRMATION" != "restore" ]; then
  echo "[restore-db] Annulé."
  exit 1
fi

DUMP_FILE="$(mktemp -t db-restore-XXXXXX).sql.gz"
cleanup() {
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

echo "[restore-db] Téléchargement de s3://${S3_BUCKET}/${S3_KEY}…"
aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "$DUMP_FILE" "${ENDPOINT_ARGS[@]}"

echo "[restore-db] Restauration en cours…"
gunzip -c "$DUMP_FILE" | psql "$DATABASE_URL"

echo "[restore-db] Restauration terminée."
