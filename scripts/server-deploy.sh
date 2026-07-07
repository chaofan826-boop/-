#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR=/opt/cross-border
mkdir -p "$DEPLOY_DIR"
tar -xzf /opt/cross-border-deploy.tgz -C "$DEPLOY_DIR"
rm -f /opt/cross-border-deploy.tgz
cp "$DEPLOY_DIR/docker-compose.prod.yml" "$DEPLOY_DIR/docker-compose.yml"
rm -f "$DEPLOY_DIR/docker-compose.override.yml"
mkdir -p "$DEPLOY_DIR/data/uploads"

if [ ! -f "$DEPLOY_DIR/.env" ]; then
  MYSQL_PASS=$(openssl rand -hex 12)
  JWT_SEC=$(openssl rand -hex 24)
  cat > "$DEPLOY_DIR/.env" <<EOF
COMPOSE_PROJECT_NAME=cross-border
TZ=Asia/Shanghai
NGINX_HTTP_PORT=80
MYSQL_PORT=13306
REDIS_PORT=16379
BACKEND_PORT=13000
MYSQL_ROOT_PASSWORD=${MYSQL_PASS}
MYSQL_DATABASE=cross_border
NODE_ENV=production
PORT=3000
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=${MYSQL_PASS}
DB_DATABASE=cross_border
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=${JWT_SEC}
JWT_EXPIRES_IN=7d
VITE_API_BASE_URL=/api
EOF
  echo "$MYSQL_PASS" > "$DEPLOY_DIR/.deploy-secrets.txt"
  chmod 600 "$DEPLOY_DIR/.deploy-secrets.txt"
fi

cd "$DEPLOY_DIR"
docker-compose up -d --build

echo "Waiting for services..."
sleep 20
docker-compose ps
curl -fsS http://127.0.0.1/api/products?page=1\&pageSize=1 | head -c 200 || true
echo
echo "Deploy finished."
