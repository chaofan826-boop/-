# 本地开发（无需 Docker 全栈）

## 方式一：纯 npm 开发（推荐调试前端）

### 1. 启动数据库（需 Docker Desktop 运行）

```bash
docker compose up -d mysql redis
```

### 2. 启动后端

```bash
cd backend
cp .env.example .env   # 首次
npm run start:dev
```

### 3. 启动前端

```bash
# 终端 2 - 后台
cd frontend-admin && npm run dev

# 终端 3 - 商城
cd frontend-store && npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 商城 | http://localhost:5174 |
| 后台 | http://localhost:5173/admin/ |
| API | http://localhost:3000/api |

> 注意：本地开发请访问 **5173/5174 端口**，不是 http://localhost

---

## 方式二：Docker 一键部署

### 1. 启动 Docker Desktop

确保 Docker Desktop 正在运行（系统托盘有 Docker 图标）。

### 2. 启动全部服务

```bash
cp .env.example .env
docker compose up -d --build
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 商城 | http://localhost |
| 后台 | http://localhost/admin/ |
| API | http://localhost/api |

---

## 常见问题

### 页面打不开 / 连接被拒绝

- **Docker 方式**：确认 Docker Desktop 已启动，执行 `docker compose ps` 查看 6 个服务是否均为 running
- **本地开发**：确认访问的是 `5173/admin/` 和 `5174`，不是 `localhost:80`

### 后台白屏

- 必须访问带 `/admin/` 后缀的地址
- Docker 部署后重新构建：`docker compose up -d --build frontend-admin nginx`

### API 报错

- 确认 backend 已启动：`docker compose logs backend`
- 确认 MySQL/Redis 健康：`docker compose ps`
