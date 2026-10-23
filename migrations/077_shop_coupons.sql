-- description: Single-store fixed-value coupons and immutable order discount snapshots.
-- depends: 071,072,075
-- reversible: disable new coupon usage; retain these tables/columns for existing discounted orders.
-- Never drop redemption history while orders still reference it.
CREATE TABLE IF NOT EXISTS shop_coupons (
 id INT AUTO_INCREMENT PRIMARY KEY,
 merchant_id INT NOT NULL,
 code VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 name_zh VARCHAR(120) NOT NULL, name_en VARCHAR(120) NOT NULL,
 discount_cents INT UNSIGNED NOT NULL, min_subtotal_cents INT UNSIGNED NOT NULL DEFAULT 0,
 starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL,
 total_limit INT UNSIGNED NOT NULL, per_user_limit INT UNSIGNED NOT NULL DEFAULT 1,
 reserved_count INT UNSIGNED NOT NULL DEFAULT 0, redeemed_count INT UNSIGNED NOT NULL DEFAULT 0,
 status VARCHAR(20) NOT NULL DEFAULT 'active',
 created_by INT NOT NULL, create_key VARCHAR(80) NOT NULL, create_hash CHAR(64) NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_shop_coupon_code(code), UNIQUE KEY uk_shop_coupon_create(created_by,create_key),
 INDEX idx_shop_coupon_merchant(merchant_id,status,created_at),
 FOREIGN KEY(merchant_id) REFERENCES shop_merchants(id), FOREIGN KEY(created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_coupon_redemptions (
 id INT AUTO_INCREMENT PRIMARY KEY, coupon_id INT NOT NULL, order_id INT NOT NULL, user_id INT NOT NULL,
 discount_cents INT UNSIGNED NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'reserved',
 redeemed_at DATETIME NULL, released_at DATETIME NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_shop_coupon_order(order_id),
 INDEX idx_shop_coupon_user(coupon_id,user_id,status), INDEX idx_shop_coupon_status(coupon_id,status),
 FOREIGN KEY(coupon_id) REFERENCES shop_coupons(id), FOREIGN KEY(order_id) REFERENCES shop_orders(id),
 FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SET @shop_ddl = (SELECT IF(COUNT(*)=0,'ALTER TABLE shop_orders ADD COLUMN subtotal_cents INT UNSIGNED NULL','SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_orders' AND COLUMN_NAME='subtotal_cents');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0,'ALTER TABLE shop_orders ADD COLUMN discount_cents INT UNSIGNED NULL','SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_orders' AND COLUMN_NAME='discount_cents');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0,'ALTER TABLE shop_orders ADD COLUMN coupon_json JSON NULL','SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_orders' AND COLUMN_NAME='coupon_json');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
