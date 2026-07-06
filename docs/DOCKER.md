# Docker 部署说明

## 架构

```
                    ┌─────────────┐
                    │   nginx:80  │  ← 统一入口
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
      / (商城)        /admin/          /api/
           │               │               │
  frontend-store   frontend-admin      backend
                                       :3000
                                  ┌─────┴─────┐
                                  │           │
                                mysql       redis
```

## 一键启动

```bash
cp .env.example .env
docker compose up -d --build
```

## 环境变量

所有配置见项目根目录 `.env.example`，复制为 `.env` 后修改。

## 服务说明

- **nginx**：反向代理，不构建前端，仅做路由转发
- **frontend-admin / frontend-store**：独立构建 Vue 产物 + 内置 Nginx
- **backend**：NestJS，`NODE_ENV=development` 时 TypeORM 自动同步表结构
- **mysql**：首次启动执行 `docker/mysql/init.sql`
- **redis**：JWT Token 缓存

## 路由规则

| 路径 | 目标 |
|------|------|
| `/` | frontend-store |
| `/admin/` | frontend-admin |
| `/api/` | backend:3000 |
