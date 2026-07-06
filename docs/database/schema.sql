-- ============================================================
-- 跨境电商系统 - MySQL 数据库表结构
-- 特性：多商户(merchant_id) / 多币种(currency) / 软删除(deleted_at)
-- 字符集：utf8mb4 | 引擎：InnoDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS cross_border
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cross_border;

-- ------------------------------------------------------------
-- 0. 商户表 merchants
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchants (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  merchant_code VARCHAR(32)     NOT NULL COMMENT '商户编码',
  name          VARCHAR(128)    NOT NULL COMMENT '商户名称',
  contact_email VARCHAR(255)    NOT NULL COMMENT '联系邮箱',
  contact_phone VARCHAR(32)     DEFAULT NULL COMMENT '联系电话',
  country_code  CHAR(2)         NOT NULL DEFAULT 'US' COMMENT '所在国家 ISO-3166',
  default_currency CHAR(3)     NOT NULL DEFAULT 'USD' COMMENT '默认结算币种 ISO-4217',
  status        TINYINT         NOT NULL DEFAULT 1 COMMENT '状态: 0禁用 1启用 2审核中',
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  deleted_at    DATETIME(3)     DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_merchants_code (merchant_code),
  KEY idx_merchants_status_deleted (status, deleted_at),
  KEY idx_merchants_country (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商户表';

-- ------------------------------------------------------------
-- 1. 用户表 users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  merchant_id   BIGINT UNSIGNED DEFAULT NULL COMMENT '所属商户ID，平台管理员/普通买家为NULL',
  email         VARCHAR(255)    NOT NULL COMMENT '登录邮箱',
  password      VARCHAR(255)    NOT NULL COMMENT '密码哈希',
  name          VARCHAR(100)    NOT NULL COMMENT '昵称/姓名',
  phone         VARCHAR(32)     DEFAULT NULL COMMENT '手机号',
  role          ENUM('platform_admin', 'merchant_admin', 'merchant_staff', 'customer')
                NOT NULL DEFAULT 'customer' COMMENT '角色',
  status        TINYINT         NOT NULL DEFAULT 1 COMMENT '状态: 0禁用 1正常',
  last_login_at DATETIME(3)     DEFAULT NULL COMMENT '最后登录时间',
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  deleted_at    DATETIME(3)     DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email_deleted (email, deleted_at),
  KEY idx_users_merchant_role (merchant_id, role, deleted_at),
  KEY idx_users_role_status (role, status, deleted_at),
  CONSTRAINT fk_users_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ------------------------------------------------------------
-- 2. 商品 SPU 表 products
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  merchant_id   BIGINT UNSIGNED NOT NULL COMMENT '商户ID',
  spu_code      VARCHAR(64)     NOT NULL COMMENT 'SPU编码',
  name          VARCHAR(255)    NOT NULL COMMENT '商品名称',
  subtitle      VARCHAR(512)    DEFAULT NULL COMMENT '副标题',
  description   MEDIUMTEXT      COMMENT '商品详情',
  category_id   BIGINT UNSIGNED DEFAULT NULL COMMENT '类目ID',
  brand         VARCHAR(128)    DEFAULT NULL COMMENT '品牌',
  main_image    VARCHAR(512)    DEFAULT NULL COMMENT '主图URL',
  images        JSON            DEFAULT NULL COMMENT '图片列表 JSON数组',
  origin_country CHAR(2)        DEFAULT NULL COMMENT '原产国 ISO-3166',
  status        ENUM('draft', 'active', 'inactive', 'archived')
                NOT NULL DEFAULT 'draft' COMMENT '商品状态',
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  deleted_at    DATETIME(3)     DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_products_merchant_spu (merchant_id, spu_code, deleted_at),
  KEY idx_products_merchant_status (merchant_id, status, deleted_at),
  KEY idx_products_category (category_id, status, deleted_at),
  KEY idx_products_name (name(64)),
  CONSTRAINT fk_products_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品SPU表';

-- ------------------------------------------------------------
-- 3. 商品 SKU 表 product_skus
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_skus (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  merchant_id   BIGINT UNSIGNED NOT NULL COMMENT '商户ID(冗余，便于分库分表查询)',
  product_id    BIGINT UNSIGNED NOT NULL COMMENT 'SPU ID',
  sku_code      VARCHAR(64)     NOT NULL COMMENT 'SKU编码',
  spec_values   JSON            NOT NULL COMMENT '规格属性，如 {"color":"Red","size":"M"}',
  spec_text     VARCHAR(255)    NOT NULL DEFAULT '' COMMENT '规格展示文本，如 Red / M',
  price         DECIMAL(12, 2)  NOT NULL COMMENT '销售价',
  cost_price    DECIMAL(12, 2)  DEFAULT NULL COMMENT '成本价',
  currency      CHAR(3)         NOT NULL DEFAULT 'USD' COMMENT '定价币种 ISO-4217',
  weight        DECIMAL(10, 3)  DEFAULT NULL COMMENT '重量(kg)，用于运费计算',
  barcode       VARCHAR(64)     DEFAULT NULL COMMENT '条形码/EAN',
  image_url     VARCHAR(512)    DEFAULT NULL COMMENT 'SKU图片',
  status        ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'SKU状态',
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  deleted_at    DATETIME(3)     DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_skus_merchant_code (merchant_id, sku_code, deleted_at),
  KEY idx_skus_product_status (product_id, status, deleted_at),
  KEY idx_skus_merchant_product (merchant_id, product_id, deleted_at),
  KEY idx_skus_currency (currency),
  CONSTRAINT fk_skus_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  CONSTRAINT fk_skus_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品SKU表';

-- ------------------------------------------------------------
-- 4. 库存表 inventory
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  merchant_id     BIGINT UNSIGNED NOT NULL COMMENT '商户ID',
  product_sku_id  BIGINT UNSIGNED NOT NULL COMMENT 'SKU ID',
  warehouse_code  VARCHAR(32)     NOT NULL DEFAULT 'DEFAULT' COMMENT '仓库编码',
  total_qty       INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '总库存',
  available_qty   INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '可用库存',
  locked_qty      INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '锁定库存(下单未支付)',
  low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 10 COMMENT '低库存预警阈值',
  version         INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  deleted_at      DATETIME(3)     DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_inventory_sku_warehouse (product_sku_id, warehouse_code, deleted_at),
  KEY idx_inventory_merchant_available (merchant_id, available_qty, deleted_at),
  KEY idx_inventory_low_stock (merchant_id, available_qty, low_stock_threshold),
  CONSTRAINT fk_inventory_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  CONSTRAINT fk_inventory_sku FOREIGN KEY (product_sku_id) REFERENCES product_skus(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存表';

-- ------------------------------------------------------------
-- 5. 订单表 orders
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  order_no        VARCHAR(32)     NOT NULL COMMENT '订单号',
  user_id         BIGINT UNSIGNED NOT NULL COMMENT '买家用户ID',
  merchant_id     BIGINT UNSIGNED NOT NULL COMMENT '商户ID',
  currency        CHAR(3)         NOT NULL COMMENT '订单币种 ISO-4217',
  exchange_rate   DECIMAL(12, 6)  DEFAULT NULL COMMENT '下单时汇率(相对USD)',
  subtotal_amount DECIMAL(12, 2)  NOT NULL DEFAULT 0.00 COMMENT '商品小计',
  shipping_amount DECIMAL(12, 2)  NOT NULL DEFAULT 0.00 COMMENT '运费',
  tax_amount      DECIMAL(12, 2)  NOT NULL DEFAULT 0.00 COMMENT '税费',
  discount_amount DECIMAL(12, 2)  NOT NULL DEFAULT 0.00 COMMENT '优惠金额',
  total_amount    DECIMAL(12, 2)  NOT NULL DEFAULT 0.00 COMMENT '订单总额',
  status          ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunding', 'refunded')
                  NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  payment_status  ENUM('unpaid', 'paying', 'paid', 'partial_refund', 'refunded')
                  NOT NULL DEFAULT 'unpaid' COMMENT '支付状态',
  shipping_status ENUM('unshipped', 'partial', 'shipped', 'delivered')
                  NOT NULL DEFAULT 'unshipped' COMMENT '物流状态',
  receiver_name   VARCHAR(100)    NOT NULL COMMENT '收货人',
  receiver_phone  VARCHAR(32)     NOT NULL COMMENT '收货电话',
  receiver_country CHAR(2)        NOT NULL COMMENT '收货国家',
  receiver_state  VARCHAR(64)     DEFAULT NULL COMMENT '省/州',
  receiver_city   VARCHAR(64)     DEFAULT NULL COMMENT '城市',
  receiver_address VARCHAR(512)   NOT NULL COMMENT '详细地址',
  receiver_zip    VARCHAR(20)     DEFAULT NULL COMMENT '邮编',
  buyer_remark    VARCHAR(512)    DEFAULT NULL COMMENT '买家备注',
  paid_at         DATETIME(3)     DEFAULT NULL COMMENT '支付时间',
  shipped_at      DATETIME(3)     DEFAULT NULL COMMENT '发货时间',
  completed_at    DATETIME(3)     DEFAULT NULL COMMENT '完成时间',
  cancelled_at    DATETIME(3)     DEFAULT NULL COMMENT '取消时间',
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  deleted_at      DATETIME(3)     DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_orders_order_no (order_no),
  KEY idx_orders_user_created (user_id, created_at DESC, deleted_at),
  KEY idx_orders_merchant_status_created (merchant_id, status, created_at DESC, deleted_at),
  KEY idx_orders_merchant_payment (merchant_id, payment_status, deleted_at),
  KEY idx_orders_status_created (status, created_at DESC),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_orders_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- ------------------------------------------------------------
-- 6. 订单明细表 order_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  order_id        BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
  merchant_id     BIGINT UNSIGNED NOT NULL COMMENT '商户ID(冗余)',
  product_id      BIGINT UNSIGNED NOT NULL COMMENT 'SPU ID',
  product_sku_id  BIGINT UNSIGNED NOT NULL COMMENT 'SKU ID',
  product_name    VARCHAR(255)    NOT NULL COMMENT '商品名称快照',
  sku_code        VARCHAR(64)     NOT NULL COMMENT 'SKU编码快照',
  spec_text       VARCHAR(255)    NOT NULL DEFAULT '' COMMENT '规格快照',
  image_url       VARCHAR(512)    DEFAULT NULL COMMENT '商品图片快照',
  unit_price      DECIMAL(12, 2)  NOT NULL COMMENT '成交单价',
  currency        CHAR(3)         NOT NULL COMMENT '币种快照',
  quantity        INT UNSIGNED    NOT NULL DEFAULT 1 COMMENT '购买数量',
  total_amount    DECIMAL(12, 2)  NOT NULL COMMENT '行小计 = unit_price * quantity',
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  deleted_at      DATETIME(3)     DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id, deleted_at),
  KEY idx_order_items_merchant_sku (merchant_id, product_sku_id, deleted_at),
  KEY idx_order_items_product (product_id, deleted_at),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_order_items_sku FOREIGN KEY (product_sku_id) REFERENCES product_skus(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细表';

-- ------------------------------------------------------------
-- 7. 支付表 payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  payment_no          VARCHAR(32)     NOT NULL COMMENT '支付流水号',
  order_id            BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
  user_id             BIGINT UNSIGNED NOT NULL COMMENT '支付用户ID',
  merchant_id         BIGINT UNSIGNED NOT NULL COMMENT '商户ID',
  amount              DECIMAL(12, 2)  NOT NULL COMMENT '支付金额',
  currency            CHAR(3)         NOT NULL COMMENT '支付币种 ISO-4217',
  exchange_rate       DECIMAL(12, 6)  DEFAULT NULL COMMENT '支付时汇率',
  payment_method      ENUM('stripe', 'paypal', 'alipay', 'wechat', 'bank_transfer', 'other')
                      NOT NULL COMMENT '支付方式',
  status              ENUM('pending', 'processing', 'success', 'failed', 'closed', 'refunding', 'refunded')
                      NOT NULL DEFAULT 'pending' COMMENT '支付状态',
  third_party_trade_no VARCHAR(128)   DEFAULT NULL COMMENT '第三方支付流水号',
  third_party_response JSON           DEFAULT NULL COMMENT '第三方回调原始数据',
  fail_reason         VARCHAR(512)    DEFAULT NULL COMMENT '失败原因',
  paid_at             DATETIME(3)     DEFAULT NULL COMMENT '支付成功时间',
  expired_at          DATETIME(3)     DEFAULT NULL COMMENT '支付过期时间',
  created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  deleted_at          DATETIME(3)     DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_payments_payment_no (payment_no),
  KEY idx_payments_order (order_id, deleted_at),
  KEY idx_payments_user_created (user_id, created_at DESC, deleted_at),
  KEY idx_payments_merchant_status (merchant_id, status, created_at DESC, deleted_at),
  KEY idx_payments_third_party (third_party_trade_no),
  KEY idx_payments_status_expired (status, expired_at),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_payments_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付表';

-- ------------------------------------------------------------
-- 示例种子数据
-- ------------------------------------------------------------
INSERT INTO merchants (merchant_code, name, contact_email, country_code, default_currency, status)
VALUES
  ('M001', 'Global Tech Store', 'merchant1@example.com', 'US', 'USD', 1),
  ('M002', 'Euro Fashion Hub', 'merchant2@example.com', 'DE', 'EUR', 1);
