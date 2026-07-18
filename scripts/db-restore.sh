#!/bin/sh
# Restore a NookApp Postgres dump produced by db-backup.sh.
# The dump is idempotent (--clean --if-exists), so it drops and recreates objects.
#
# Usage on the VPS, from the stack directory:
#   docker compose -f docker-compose.app.yml run --rm db-backup \
#     /usr/local/bin/db-restore.sh /backups/nookapp-YYYYmmdd-HHMMSS.sql.gz
set -eu

FILE="${1:?usage: db-restore.sh <path-to-backup.sql.gz>}"

echo "[db-restore] restoring ${FILE} into ${PGDATABASE}@${PGHOST}"
echo "[db-restore] WARNING: this overwrites existing data. Ctrl-C within 5s to abort."
sleep 5

gunzip -c "$FILE" | psql --set ON_ERROR_STOP=on
echo "[db-restore] done."
