---
id: ITEM-056
title: Sauvegardes base de données automatisées
status: implemented
priority: P2
type: chore
estimate: S
depends_on: []
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Sans sauvegarde automatisée, un incident (erreur humaine, bug de migration) peut
entraîner une perte de données irréversible pour tous les clients du SaaS Core.

## User story
En tant que plateforme, je veux des sauvegardes automatiques de la base de données,
afin de pouvoir restaurer les données en cas d'incident.

## Critères d'acceptation
- [x] Script/job planifié effectue un dump PostgreSQL régulier vers un stockage
      externe (S3-compatible, ITEM-027).
- [x] Une procédure de restauration documentée est testée au moins une fois.
- [x] Les sauvegardes sont conservées selon une politique de rétention définie (ex. 30
      jours glissants).

## Notes techniques
Fichiers : `scripts/backup-db.sh`, `scripts/restore-db.sh`, `README.md` (section
« Sauvegardes et restauration »), `package.json` (`db:backup`/`db:restore`).

Décisions à l'implémentation :
- **Scripts shell autonomes**, pas de script Node/Prisma : `pg_dump`/`psql` opèrent
  directement sur `DATABASE_URL` (dump/restore SQL brut, hors du contrôle applicatif),
  cohérent avec l'esprit d'un job cron/CI plutôt qu'un script du runtime de l'app.
  Prérequis explicites documentés en en-tête (`pg_dump`/`aws` — AWS CLI v2, pas une
  dépendance `package.json`) plutôt que codés en dur : le repo n'imposait jusqu'ici
  aucun outil CLI externe, ce script introduit ce nouveau prérequis d'infra
  délibérément (aucune alternative sans dépendance externe pour dumper PostgreSQL).
- **Stockage** : réutilise les variables d'env S3 déjà en place pour les documents
  (`S3_ENDPOINT`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`, ITEM-027) — pas
  de nouvelle configuration à maintenir. Préfixe dédié `backups/postgres/` (configurable
  via `BACKUP_PREFIX`) pour ne jamais entrer en collision avec les clés de documents
  (`organizations/<id>/documents/...`).
- **Rétention (30 jours par défaut, `BACKUP_RETENTION_DAYS`)** : implémentée par
  comparaison de chaînes sur un horodatage `%Y%m%dT%H%M%SZ` encodé dans le nom de
  fichier (trie lexicographiquement comme chronologiquement) plutôt qu'en reparsant le
  champ `LastModified` retourné par `aws s3 ls`/`list-objects` — ce format varie selon
  l'implémentation S3 (AWS S3 vs MinIO vs R2) et aurait rendu la purge fragile
  cross-provider. La date de coupure est calculée une fois par exécution (`date -u -d`
  GNU avec repli BSD `date -u -v` pour le développement macOS) puis comparée en pur
  bash, sans dépendance externe.
- **Restauration destructive, jamais automatique** : `restore-db.sh` exige une
  confirmation interactive explicite (`taper 'restore'`) avant d'écraser
  `DATABASE_URL` — aucune option `--force`/non-interactive fournie, pour qu'un script
  de déploiement ne puisse pas accidentellement déclencher une restauration.
- **Testé de bout en bout en développement** (voir Journal) avec l'infra réelle du
  projet (MinIO du `docker-compose.yml`, base Postgres locale) :
  1. `pg_dump`/`psql`/`aws` CLI absents localement → installés via Homebrew
     (`libpq`, `awscli`) pour permettre le test réel (pas de mock).
  2. `./scripts/backup-db.sh` exécuté contre la vraie base de dev
     (`nextjs_starter_kit`) → dump `.sql.gz` confirmé présent dans le bucket MinIO
     (`app-documents/backups/postgres/<horodatage>.sql.gz`), contenu vérifié
     (31 instructions `COPY`, une par table).
  3. Restauration testée vers une base **jetable dédiée**
     (`restore_test_item056`, jamais la base de dev réelle) via
     `./scripts/restore-db.sh --latest` : toutes les tables/index/contraintes
     recréés, comptages de lignes identiques à la source sur `user`
     (3), `organization` (2), `plan` (2), et données réelles (noms/emails) confirmées
     présentes après restauration.
  4. Politique de rétention vérifiée en conditions réelles : upload de faux dumps
     horodatés à 60 jours et 5 jours dans le passé, `backup-db.sh` relancé avec
     `BACKUP_RETENTION_DAYS=30` → seul le dump à 60 jours supprimé ; relancé avec
     `BACKUP_RETENTION_DAYS=3` → le dump à 5 jours supprimé également, les plus
     récents conservés.
  5. Nettoyage complet après test : base jetable supprimée, objets de test retirés du
     bucket, conteneur MinIO arrêté (`docker compose stop minio`, pas de suppression
     du volume — état antérieur à cet item restauré).
- Documentation de la procédure de restauration et de planification ajoutée à
  `README.md` (« Sauvegardes et restauration »), avec la note de compatibilité
  `pg_dump`/`psql` (18+) découverte pendant le test (méta-commandes `\restrict`/
  `\unrestrict`).

## Captures attendues
N/A (opérationnel — vérifiable via la présence des dumps dans le bucket et un test de
restauration réussi). Testé de bout en bout en développement — voir Notes techniques
et Journal pour le détail (comptages de lignes avant/après restauration, purge de
rétention observée).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : `scripts/backup-db.sh` (dump PostgreSQL
  compressé → S3-compatible, purge par rétention configurable) et
  `scripts/restore-db.sh` (restauration depuis une clé S3 ou `--latest`, confirmation
  interactive requise), documentation dans `README.md`, alias `pnpm db:backup`/
  `db:restore`. Fichiers : `scripts/backup-db.sh`, `scripts/restore-db.sh`,
  `README.md`, `package.json`. Testé de bout en bout en dev avec l'infra réelle du
  projet (MinIO + Postgres local) : sauvegarde réussie et vérifiée dans le bucket,
  restauration réussie vers une base de test jetable avec comptages de lignes
  identiques à la source, purge de rétention vérifiée à deux seuils différents (voir
  Notes techniques pour le détail complet).
