#!/bin/bash
set -e

echo "[entrypoint] Running database migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Starting uvicorn..."
exec uvicorn config.asgi:application \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2
