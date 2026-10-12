-- description: Independent campus merchants and payment instructions.
CREATE TABLE IF NOT EXISTS shop_merchants (
 id INT AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(60) NOT NULL UNIQUE,
 name_zh VARCHAR(120) NOT NULL, name_en VARCHAR(120) NOT NULL,
 enabled TINYINT NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Merchants are created explicitly through authorized account management.
CREATE TABLE IF NOT EXISTS shop_merchant_members (
 merchant_id INT NOT NULL, user_id INT NOT NULL,
 PRIMARY KEY (merchant_id,user_id), FOREIGN KEY (merchant_id) REFERENCES shop_merchants(id), FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_products ADD COLUMN merchant_id INT NOT NULL DEFAULT 1', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_products' AND COLUMN_NAME='merchant_id');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_products ADD INDEX idx_shop_products_merchant (merchant_id)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_products' AND INDEX_NAME='idx_shop_products_merchant');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD COLUMN merchant_id INT NOT NULL DEFAULT 1', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND COLUMN_NAME='merchant_id');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD INDEX idx_shop_slots_merchant (merchant_id)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND INDEX_NAME='idx_shop_slots_merchant');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_orders ADD COLUMN merchant_id INT NOT NULL DEFAULT 1', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_orders' AND COLUMN_NAME='merchant_id');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_orders ADD INDEX idx_shop_orders_merchant (merchant_id)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_orders' AND INDEX_NAME='idx_shop_orders_merchant');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_settings ADD COLUMN payment_methods JSON NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_settings' AND COLUMN_NAME='payment_methods');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_settings ADD COLUMN delivery_zones JSON NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_settings' AND COLUMN_NAME='delivery_zones');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
CREATE TABLE IF NOT EXISTS shop_payment_proofs (
 order_id INT PRIMARY KEY, content_type VARCHAR(30) NOT NULL, image LONGBLOB NOT NULL,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (order_id) REFERENCES shop_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
