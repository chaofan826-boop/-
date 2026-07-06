# 跨境电商全栈项目

Vue3 双前端 + NestJS 后端 + MySQL + Redis，支持 Docker 一键启动。

## 项目结构

```
├── frontend-admin/     # 后台管理系统 (Vue3 + Element Plus)
├── frontend-store/     # 商城前台 (Vue3 + Element Plus)
├── backend/            # NestJS API 服务
├── docker/             # Docker 配置 (MySQL / Nginx)
├── docs/               # 项目文档
├── docker-compose.yml  # 容器编排
├── start.bat           # Windows 一键启动
└── start.sh            # Linux/Mac 一键启动
```

## 一键启动 (Docker)

**前提：** 已安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
# 1. 复制环境变量（首次）
cp .env.example .env

# 2. 启动全部服务
# Windows
start.bat

# Linux / Mac
chmod +x start.sh && ./start.sh

# 或直接使用 docker compose
docker compose up -d --build
```

### Docker 服务

| 服务 | 容器名 | 说明 |
|------|--------|------|
| mysql | cb-mysql | MySQL 8.0 |
| redis | cb-redis | Redis 7 |
| backend | cb-backend | NestJS API |
| frontend-admin | cb-frontend-admin | 后台静态资源 |
| frontend-store | cb-frontend-store | 商城静态资源 |
| nginx | cb-nginx | 统一入口反向代理 |

### 环境变量

编辑根目录 `.env`（参考 `.env.example`）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NGINX_HTTP_PORT` | Nginx 宿主机端口 | 80 |
| `MYSQL_ROOT_PASSWORD` | MySQL 密码 | root |
| `JWT_SECRET` | JWT 密钥 | (请修改) |
| `NODE_ENV` | 后端环境 | development |
| `VITE_API_BASE_URL` | 前端 API 前缀 | /api |

### 访问地址

| 服务 | 地址 |
|------|------|
| 商城前台 | http://localhost |
| 后台管理 | http://localhost/admin |
| API | http://localhost/api |
| Backend 直连 | http://localhost:3000/api |

**默认管理员账号：** `admin@example.com` / `admin123`

### 常用命令

```bash
docker compose ps          # 查看状态
docker compose logs -f     # 查看日志
docker compose down        # 停止服务
docker compose down -v     # 停止并清除数据卷
```

## 本地开发

### 1. 启动基础设施

```bash
docker compose up -d mysql redis
```

### 2. 启动后端

```bash
cd backend
cp .env.example .env
npm run start:dev
```

API 地址：http://localhost:3000/api

### 3. 启动前端

```bash
# 后台 (端口 5173)
cd frontend-admin && npm run dev

# 商城 (端口 5174)
cd frontend-store && npm run dev
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后台前端 | Vue3, Vite, TypeScript, Element Plus, Pinia, Vue Router, Axios |
| 商城前端 | Vue3, Vite, TypeScript, Element Plus, Pinia, Vue Router, Axios |
| 后端 | NestJS, TypeORM, JWT, Passport, class-validator |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis 7 (JWT Token 缓存) |
| 部署 | Docker Compose + Nginx |

## API 模块

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET  /api/auth/profile` - 当前用户信息
- `GET  /api/products` - 商品列表
- `POST /api/products` - 创建商品 (Admin)
- `GET  /api/orders` - 订单列表
- `POST /api/orders` - 创建订单
- `GET  /api/users` - 用户列表 (Admin)

详细文档见 [docs/API.md](docs/API.md)
