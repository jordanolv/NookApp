#!/bin/sh
set -e

echo "[entrypoint] running database migrations..."
node ./node_modules/@nookapp/db/dist/migrate.js

echo "[entrypoint] starting api..."
exec node dist/main.js
