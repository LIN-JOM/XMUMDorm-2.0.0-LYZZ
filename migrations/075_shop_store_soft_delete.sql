-- description: Support reversible store removal while preserving historical orders and receipts.
-- depends: 072_shop_merchants
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_merchants ADD COLUMN deleted_at DATETIME NULL AFTER enabled', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_merchants' AND COLUMN_NAME='deleted_at');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_merchants ADD INDEX idx_shop_merchants_deleted (deleted_at,enabled)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_merchants' AND INDEX_NAME='idx_shop_merchants_deleted');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
