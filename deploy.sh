#!/bin/bash
set -e

APP_DIR="/opt/dokiflux"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

echo "=== DokiFlux Deploy ==="
cd "$APP_DIR"

echo "[1/5] Pulling latest code..."
git pull origin main

echo "[2/5] Building containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel

echo "[3/5] Starting services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "[4/5] Running migrations & collecting static..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend python manage.py migrate --noinput
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend python manage.py collectstatic --noinput

echo "[5/5] Cleaning up old images..."
docker image prune -f

echo ""
echo "=== Deploy completado! ==="
echo "Servicios activos:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
