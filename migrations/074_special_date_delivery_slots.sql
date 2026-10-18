-- description: Allow merchants to configure additional student-bookable delivery windows for specific dates.
-- depends: 073_daily_delivery_schedule
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD COLUMN delivery_start TIME NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND COLUMN_NAME='delivery_start');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD COLUMN delivery_end TIME NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND COLUMN_NAME='delivery_end');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD COLUMN is_special TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND COLUMN_NAME='is_special');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD INDEX idx_shop_special_delivery (merchant_id,is_special,delivery_date,enabled)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND INDEX_NAME='idx_shop_special_delivery');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
