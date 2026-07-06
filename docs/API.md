# API 文档

Base URL: `/api`

## 认证 Auth

### POST /auth/register
注册新用户（默认角色 customer）

```json
{
  "email": "user@example.com",
  "password": "123456",
  "name": "John"
}
```

### POST /auth/login
登录，返回 JWT Token（同时写入 Redis 缓存）

```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

响应：
```json
{
  "accessToken": "eyJhbG...",
  "user": { "id": 1, "email": "...", "name": "Admin", "role": "admin" }
}
```

### POST /auth/logout
登出，清除 Redis 中的 Token（需 Bearer Token）

### GET /auth/profile
获取当前登录用户信息（需 Bearer Token）

---

## 商品 Products

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | /products | 否 | 商品列表 |
| GET | /products/:id | 否 | 商品详情 |
| POST | /products | Admin | 创建商品 |
| PATCH | /products/:id | Admin | 更新商品 |
| DELETE | /products/:id | Admin | 删除商品 |

---

## 订单 Orders

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | /orders | 是 | 用户看自己的，Admin 看全部 |
| GET | /orders/:id | 是 | 订单详情 |
| POST | /orders | 是 | 创建订单 |
| PATCH | /orders/:id/status | Admin | 更新订单状态 |

创建订单示例：
```json
{
  "shippingAddress": "123 Main St, New York, NY",
  "items": [
    { "productId": 1, "quantity": 2 }
  ]
}
```

---

## 用户 Users

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | /users | Admin | 用户列表 |
| GET | /users/:id | 是 | 用户详情 |

---

## 认证方式

请求头添加：
```
Authorization: Bearer <accessToken>
```

Token 有效期默认 7 天，存储在 Redis 中，登出后失效。
