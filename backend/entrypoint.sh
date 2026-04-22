#!/bin/bash
set -e

echo "[entrypoint] Running database migrations..."
# --fake-initial: if an app's initial migration targets tables that already
# exist (e.g. created outside Django or by a previous failed deploy), mark it
# as applied instead of erroring with DuplicateTable. Subsequent migrations
# still run normally.
if ! python manage.py migrate --noinput --fake-initial 2>/tmp/migrate_err; then
  ERR=$(cat /tmp/migrate_err)
  echo "[entrypoint] Migration failed. Checking for recoverable errors..."
  # If the failure is because a table already exists but Django hasn't
  # recorded the migration (common after manual DB fixes or split-brain
  # deploys), we fake the specific migration and retry.
  if echo "$ERR" | grep -q "already exists" && echo "$ERR" | grep -q "project_export_logs"; then
    echo "[entrypoint] Table project_export_logs exists but migration not recorded. Faking projects.0007..."
    python manage.py migrate projects 0007 --fake || true
    python manage.py migrate --noinput --fake-initial
  else
    echo "$ERR" >&2
    exit 1
  fi
fi

echo "[entrypoint] Starting uvicorn..."
exec uvicorn config.asgi:application \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2
