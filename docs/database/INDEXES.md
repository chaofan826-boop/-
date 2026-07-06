# 索引设计说明

## 设计原则

1. **软删除友好**：复合索引末尾或独立索引包含 `deleted_at`，避免全表扫描
2. **多商户隔离**：高频查询均以 `merchant_id` 作为前缀列
3. **覆盖核心路径**：买家查单、商户查单、SKU 查库存、支付对账
4. **唯一约束防重**：业务单号 `(code, deleted_at)` 组合唯一

---

## 各表索引明细

### merchants

| 索引名 | 列 | 类型 | 查询场景 |
|--------|-----|------|----------|
| `PRIMARY` | `id` | PK | 主键 |
| `uk_merchants_code` | `merchant_code` | UNIQUE | 商户编码唯一 |
| `idx_merchants_status_deleted` | `status, deleted_at` | 普通 | 平台审核/启用商户列表 |
| `idx_merchants_country` | `country_code` | 普通 | 按国家筛选商户 |

---

### users

| 索引名 | 列 | 类型 | 查询场景 |
|--------|-----|------|----------|
| `PRIMARY` | `id` | PK | 主键 |
| `uk_users_email_deleted` | `email, deleted_at` | UNIQUE | 登录查用户，软删后可重新注册同邮箱 |
| `idx_users_merchant_role` | `merchant_id, role, deleted_at` | 普通 | 商户后台员工列表 |
| `idx_users_role_status` | `role, status, deleted_at` | 普通 | 平台用户管理/买家筛选 |

**典型 SQL：**
```sql
-- 登录
SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;

-- 商户员工列表
SELECT * FROM users
WHERE merchant_id = ? AND role IN ('merchant_admin','merchant_staff') AND deleted_at IS NULL;
```

---

### products

| 索引名 | 列 | 类型 | 查询场景 |
|--------|-----|------|----------|
| `PRIMARY` | `id` | PK | 主键 |
| `uk_products_merchant_spu` | `merchant_id, spu_code, deleted_at` | UNIQUE | 商户内 SPU 编码唯一 |
| `idx_products_merchant_status` | `merchant_id, status, deleted_at` | 普通 | 商户商品管理列表 |
| `idx_products_category` | `category_id, status, deleted_at` | 普通 | 商城类目页商品列表 |
| `idx_products_name` | `name(64)` | 前缀 | 商品名称模糊搜索 |

**典型 SQL：**
```sql
-- 商户后台商品列表
SELECT * FROM products
WHERE merchant_id = ? AND status = 'active' AND deleted_at IS NULL
ORDER BY created_at DESC LIMIT 20;

-- 商城搜索
SELECT * FROM products
WHERE status = 'active' AND deleted_at IS NULL AND name LIKE ?
ORDER BY created_at DESC;
```

---

### product_skus

| 索引名 | 列 | 类型 | 查询场景 |
|--------|-----|------|----------|
| `PRIMARY` | `id` | PK | 主键 |
| `uk_skus_merchant_code` | `merchant_id, sku_code, deleted_at` | UNIQUE | 商户内 SKU 编码唯一 |
| `idx_skus_product_status` | `product_id, status, deleted_at` | 普通 | SPU 详情页展示 SKU 列表 |
| `idx_skus_merchant_product` | `merchant_id, product_id, deleted_at` | 普通 | 商户维度 SKU 管理 |
| `idx_skus_currency` | `currency` | 普通 | 按币种筛选/统计 |

**典型 SQL：**
```sql
-- 商品详情页 SKU 列表
SELECT * FROM product_skus
WHERE product_id = ? AND status = 'active' AND deleted_at IS NULL;

-- 购物车批量查 SKU
SELECT * FROM product_skus
WHERE id IN (?) AND deleted_at IS NULL;
```

---

### inventory

| 索引名 | 列 | 类型 | 查询场景 |
|--------|-----|------|----------|
| `PRIMARY` | `id` | PK | 主键 |
| `uk_inventory_sku_warehouse` | `product_sku_id, warehouse_code, deleted_at` | UNIQUE | 同 SKU 同仓库唯一 |
| `idx_inventory_merchant_available` | `merchant_id, available_qty, deleted_at` | 普通 | 商户库存总览 |
| `idx_inventory_low_stock` | `merchant_id, available_qty, low_stock_threshold` | 普通 | 低库存预警 |

**典型 SQL：**
```sql
-- 下单查库存
SELECT * FROM inventory
WHERE product_sku_id = ? AND warehouse_code = 'DEFAULT' AND deleted_at IS NULL;

-- 低库存预警
SELECT i.*, s.sku_code, s.spec_text
FROM inventory i
JOIN product_skus s ON s.id = i.product_sku_id
WHERE i.merchant_id = ?
  AND i.available_qty <= i.low_stock_threshold
  AND i.deleted_at IS NULL;
```

---

### orders

| 索引名 | 列 | 类型 | 查询场景 |
|--------|-----|------|----------|
| `PRIMARY` | `id` | PK | 主键 |
| `uk_orders_order_no` | `order_no` | UNIQUE | 订单号全局唯一 |
| `idx_orders_user_created` | `user_id, created_at DESC, deleted_at` | 普通 | **买家订单列表**（最高频） |
| `idx_orders_merchant_status_created` | `merchant_id, status, created_at DESC, deleted_at` | 普通 | **商户订单管理** |
| `idx_orders_merchant_payment` | `merchant_id, payment_status, deleted_at` | 普通 | 商户待支付/已支付筛选 |
| `idx_orders_status_created` | `status, created_at DESC` | 普通 | 平台运营全局订单监控 |

**典型 SQL：**
```sql
-- 买家「我的订单」
SELECT * FROM orders
WHERE user_id = ? AND deleted_at IS NULL
ORDER BY created_at DESC LIMIT 20;

-- 商户待发货订单
SELECT * FROM orders
WHERE merchant_id = ? AND status = 'paid' AND deleted_at IS NULL
ORDER BY created_at ASC;

-- 订单号查单
SELECT * FROM orders WHERE order_no = ? AND deleted_at IS NULL;
```

---

### order_items

| 索引名 | 列 | 类型 | 查询场景 |
|--------|-----|------|----------|
| `PRIMARY` | `id` | PK | 主键 |
| `idx_order_items_order` | `order_id, deleted_at` | 普通 | 订单详情页查明细 |
| `idx_order_items_merchant_sku` | `merchant_id, product_sku_id, deleted_at` | 普通 | 商户 SKU 销量统计 |
| `idx_order_items_product` | `product_id, deleted_at` | 普通 | SPU 销量排行 |

**典型 SQL：**
```sql
-- 订单详情
SELECT * FROM order_items WHERE order_id = ? AND deleted_at IS NULL;

-- 商户 SKU 销量 TOP N
SELECT product_sku_id, SUM(quantity) AS sold_qty
FROM order_items
WHERE merchant_id = ? AND deleted_at IS NULL
GROUP BY product_sku_id
ORDER BY sold_qty DESC LIMIT 10;
```

---

### payments

| 索引名 | 列 | 类型 | 查询场景 |
|--------|-----|------|----------|
| `PRIMARY` | `id` | PK | 主键 |
| `uk_payments_payment_no` | `payment_no` | UNIQUE | 支付流水号唯一 |
| `idx_payments_order` | `order_id, deleted_at` | 普通 | 查订单支付记录 |
| `idx_payments_user_created` | `user_id, created_at DESC, deleted_at` | 普通 | 用户支付历史 |
| `idx_payments_merchant_status` | `merchant_id, status, created_at DESC, deleted_at` | 普通 | 商户收款流水 |
| `idx_payments_third_party` | `third_party_trade_no` | 普通 | **支付回调对账** |
| `idx_payments_status_expired` | `status, expired_at` | 普通 | 超时未支付关单定时任务 |

**典型 SQL：**
```sql
-- 支付回调
SELECT * FROM payments
WHERE third_party_trade_no = ? AND deleted_at IS NULL;

-- 超时关单定时任务
SELECT * FROM payments
WHERE status = 'pending' AND expired_at < NOW() AND deleted_at IS NULL;

-- 商户今日收款
SELECT SUM(amount) FROM payments
WHERE merchant_id = ? AND status = 'success'
  AND paid_at >= CURDATE() AND deleted_at IS NULL;
```

---

## 索引优化建议

### 1. 分页优化

深分页避免 `OFFSET`，使用游标：

```sql
SELECT * FROM orders
WHERE user_id = ? AND deleted_at IS NULL AND id < :last_id
ORDER BY id DESC LIMIT 20;
```

依赖 `idx_orders_user_created` 或额外 `(user_id, id)` 索引。

### 2. 报表类查询

大跨度统计建议：
- 异步汇总到 `daily_merchant_stats` 宽表
- 或使用 ClickHouse / ES 做 OLAP，避免直接扫 `order_items`

### 3. 分库分表预留

当单表超 500 万行时，推荐分片键：

| 表 | 分片键 | 理由 |
|----|--------|------|
| `orders` | `merchant_id` | 商户数据天然隔离 |
| `order_items` | `merchant_id` | 与 orders 同片 |
| `payments` | `merchant_id` | 与 orders 同片 |
| `inventory` | `merchant_id` | 库存按商户管理 |
| `product_skus` | `merchant_id` | SKU 按商户管理 |

`merchant_id` 冗余字段正是为分库分表和商户维度报表而设计。

### 4. 覆盖索引（可选扩展）

若「买家订单列表」只需少量字段，可加覆盖索引：

```sql
ALTER TABLE orders ADD INDEX idx_orders_user_list
  (user_id, deleted_at, created_at DESC, order_no, status, total_amount, currency);
```

需权衡写入开销，建议在 QPS 确认后再加。
