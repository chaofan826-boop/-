@echo off
echo ========================================
echo   本地开发模式
echo ========================================
echo.
echo [步骤1] 请先启动 Docker Desktop
echo [步骤2] 双击 start-infra.bat 启动 MySQL+Redis
echo        或手动: docker compose -f docker-compose.infra.yml up -d
echo.
echo 如使用本机 MySQL，请在 MySQL 中执行:
echo   CREATE DATABASE cross_border;
echo.
pause

start "backend" cmd /k "cd /d %~dp0backend && npm run start:dev"
timeout /t 5 /nobreak >nul
start "frontend-admin" cmd /k "cd /d %~dp0frontend-admin && npm run dev"
start "frontend-store" cmd /k "cd /d %~dp0frontend-store && npm run dev"

echo.
echo   商城:  http://localhost:5174
echo   后台:  http://localhost:5173/admin/
echo   API:   http://localhost:3000/api
echo.
echo 502 错误 = 后端未启动，请确认 backend 窗口无报错
pause
