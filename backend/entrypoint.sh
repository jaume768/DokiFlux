#!/bin/bash
set -e

echo "[entrypoint] Running database migrations..."
# --fake-initial: if an app's initial migration targets tables that already
# exist (e.g. created outside Django or by a previous failed deploy), mark it
# as applied instead of erroring with DuplicateTable. Subsequent migrations
# still run normally.
python manage.py migrate --noinput --fake-initial

echo "[entrypoint] Starting uvicorn..."
exec uvicorn config.asgi:application \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2
