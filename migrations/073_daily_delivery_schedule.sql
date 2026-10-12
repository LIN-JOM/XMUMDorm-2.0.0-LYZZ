-- description: Daily recurring merchant delivery windows, materialized as dated slots.
-- depends: 072_shop_merchants
CREATE TABLE IF NOT EXISTS shop_daily_schedules (
 id INT AUTO_INCREMENT PRIMARY KEY,
 merchant_id INT NOT NULL,
 label_zh VARCHAR(120) NOT NULL,
 label_en VARCHAR(120) NOT NULL,
 delivery_start TIME NOT NULL,
 delivery_end TIME NOT NULL,
 capacity INT UNSIGNED NOT NULL DEFAULT 100,
 enabled TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_shop_daily_schedule_merchant (merchant_id),
 CONSTRAINT fk_shop_daily_schedule_merchant FOREIGN KEY (merchant_id) REFERENCES shop_merchants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD COLUMN schedule_id INT NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND COLUMN_NAME='schedule_id');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD UNIQUE KEY uk_shop_schedule_date (schedule_id,delivery_date)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND INDEX_NAME='uk_shop_schedule_date');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD CONSTRAINT fk_shop_slot_schedule FOREIGN KEY (schedule_id) REFERENCES shop_daily_schedules(id) ON DELETE SET NULL', 'SELECT 1') FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='fk_shop_slot_schedule');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
