#!/bin/sh
# Single Postgres dump + retention prune. Run by the db-backup sidecar loop.
# Reads connection from PG* env vars (PGHOST/PGUSER/PGPASSWORD/PGDATABASE).
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/nookapp-${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[db-backup] $(date -Iseconds) dumping ${PGDATABASE}@${PGHOST} -> ${FILE}"
# --clean --if-exists makes the dump idempotent so db-restore.sh can replay it
# onto an existing database without manual drops.
pg_dump --clean --if-exists --no-owner --no-privileges | gzip -9 > "${FILE}.tmp"
mv "${FILE}.tmp" "$FILE"
echo "[db-backup] done: $(du -h "$FILE" | cut -f1)"

# Offsite copy (optional): push to an S3-compatible bucket (e.g. OVH Object Storage)
# when S3_BUCKET is set and the aws cli is available in the image.
if [ -n "${S3_BUCKET:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    echo "[db-backup] uploading to s3://${S3_BUCKET}/"
    aws s3 cp "$FILE" "s3://${S3_BUCKET}/" ${S3_ENDPOINT:+--endpoint-url "$S3_ENDPOINT"}
  else
    echo "[db-backup] WARN S3_BUCKET set but aws cli missing in image; skipping offsite copy"
  fi
fi

echo "[db-backup] pruning local backups older than ${RETENTION_DAYS}d"
find "$BACKUP_DIR" -name 'nookapp-*.sql.gz' -mtime "+${RETENTION_DAYS}" -print -delete
