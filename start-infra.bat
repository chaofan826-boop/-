@echo off
echo ========================================
echo   启动基础设施 MySQL + Redis
echo   需要 Docker Desktop 正在运行
echo ========================================

if not exist .env copy .env.example .env

docker compose -f docker-compose.infra.yml up -d

echo.
echo MySQL: localhost:3306  (root/root)
echo Redis: localhost:6379
echo.
echo 然后运行:
echo   cd backend ^&^& npm run start:dev
echo   cd frontend-admin ^&^& npm run dev
echo   cd frontend-store ^&^& npm run dev
pause
