# 架构说明

## 系统概览

```
                    ┌─────────────┐
                    │   Nginx     │
                    │   :80       │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
    /admin (静态)     / (静态)        /api (代理)
           │               │               │
  frontend-admin   frontend-store      backend
                                          :3000
                                    ┌─────┴─────┐
                                    │           │
                                  MySQL       Redis
                                  :3306       :6379
```

## 模块划分

### Backend (NestJS)

| 模块 | 职责 |
|------|------|
| auth | JWT 登录/注册/登出，Token Redis 缓存校验 |
| user | 用户 CRUD |
| product | 商品 CRUD |
| order | 订单创建与状态管理 |
| common/redis | Redis 连接与 Token 存取 |
| common/seed | 首次启动创建默认管理员 |

### Frontend Admin

后台管理：Dashboard、商品管理、订单管理、用户管理

### Frontend Store

商城前台：首页、商品浏览、购物车、下单、用户注册/登录

## 数据库表

- `users` - 用户（admin / customer）
- `products` - 商品
- `orders` - 订单
- `order_items` - 订单明细

初始化脚本：`docker/mysql/init.sql`

## Redis 用途

- Key: `auth:token:{userId}`
- Value: JWT access token
- TTL: 与 JWT 过期时间一致
- 登出时删除，JWT 校验时比对 Redis 中的 Token

## 环境变量

见 `backend/.env.example`
