@echo off
if not exist .env (
  echo [INFO] .env not found, copying from .env.example ...
  copy .env.example .env
)

echo Starting Cross-Border E-Commerce Stack...
docker compose up -d --build

echo.
echo ========================================
echo   Services started successfully!
echo ========================================
echo   Store:   http://localhost:%NGINX_HTTP_PORT%
echo   Admin:   http://localhost:%NGINX_HTTP_PORT%/admin
echo   API:     http://localhost:%NGINX_HTTP_PORT%/api
echo.
echo   MySQL:   localhost:3306
echo   Redis:   localhost:6379
echo   Backend: localhost:3000
echo.
echo   Default admin: admin@example.com / admin123
echo ========================================
docker compose ps
