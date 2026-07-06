#!/usr/bin/env bash
set -e

if [ ! -f .env ]; then
  echo "[INFO] .env not found, copying from .env.example ..."
  cp .env.example .env
fi

# shellcheck disable=SC1091
source .env 2>/dev/null || true

echo "Starting Cross-Border E-Commerce Stack..."
docker compose up -d --build

NGINX_PORT="${NGINX_HTTP_PORT:-80}"

echo ""
echo "========================================"
echo "  Services started successfully!"
echo "========================================"
echo "  Store:   http://localhost:${NGINX_PORT}"
echo "  Admin:   http://localhost:${NGINX_PORT}/admin"
echo "  API:     http://localhost:${NGINX_PORT}/api"
echo ""
echo "  MySQL:   localhost:${MYSQL_PORT:-3306}"
echo "  Redis:   localhost:${REDIS_PORT:-6379}"
echo "  Backend: localhost:${BACKEND_PORT:-3000}"
echo ""
echo "  Default admin: admin@example.com / admin123"
echo "========================================"
docker compose ps
