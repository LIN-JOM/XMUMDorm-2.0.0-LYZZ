-- description: Campus shop; integer MYR cents, persistent carts, immutable order snapshots.
-- depends: users
-- reversible: drop shop_addresses, shop_cart_items, shop_orders, shop_slots,
-- shop_products, shop_settings (only after exporting orders; destroys shop data).
CREATE TABLE IF NOT EXISTS shop_products (
 id INT AUTO_INCREMENT PRIMARY KEY,
 category VARCHAR(40) NOT NULL,
 name_zh VARCHAR(120) NOT NULL, name_en VARCHAR(120) NOT NULL,
 spec_zh VARCHAR(120) NOT NULL, spec_en VARCHAR(120) NOT NULL,
 description_zh TEXT NOT NULL, description_en TEXT NOT NULL,
 image_url VARCHAR(500) NOT NULL,
 price_cents INT UNSIGNED NOT NULL, stock INT UNSIGNED NOT NULL DEFAULT 0,
 sold_out TINYINT(1) NOT NULL DEFAULT 0,
 is_demo TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 deleted_at DATETIME NULL,
 INDEX idx_shop_category (category, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_slots (
 id INT AUTO_INCREMENT PRIMARY KEY,
 delivery_date DATE NOT NULL,
 label_zh VARCHAR(120) NOT NULL, label_en VARCHAR(120) NOT NULL,
 cutoff_at DATETIME NOT NULL COMMENT 'Asia/Singapore wall clock',
 capacity INT UNSIGNED NOT NULL DEFAULT 100,
 enabled TINYINT(1) NOT NULL DEFAULT 1,
 is_demo TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 deleted_at DATETIME NULL,
 INDEX idx_shop_date (delivery_date, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_settings (
 id INT PRIMARY KEY,
 delivery_notice_zh TEXT NOT NULL, delivery_notice_en TEXT NOT NULL,
 payment_zh TEXT NOT NULL, payment_en TEXT NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_addresses (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE,
 contact_name VARCHAR(100) NOT NULL, contact VARCHAR(120) NOT NULL,
 building VARCHAR(40) NOT NULL, room VARCHAR(30) NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_cart_items (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, product_id INT NOT NULL,
 quantity INT UNSIGNED NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 deleted_at DATETIME NULL,
 UNIQUE KEY uk_shop_cart (user_id, product_id),
 FOREIGN KEY (user_id) REFERENCES users(id),
 FOREIGN KEY (product_id) REFERENCES shop_products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_orders (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, slot_id INT NOT NULL,
 idempotency_key VARCHAR(80) NOT NULL, request_hash CHAR(64) NOT NULL,
 address_json JSON NOT NULL, items_json JSON NOT NULL, slot_json JSON NOT NULL,
 payment_json JSON NOT NULL,
 total_cents INT UNSIGNED NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_shop_request (user_id, idempotency_key),
 INDEX idx_shop_orders_slot (slot_id, status),
 INDEX idx_shop_orders_user (user_id, created_at),
 FOREIGN KEY (user_id) REFERENCES users(id),
 FOREIGN KEY (slot_id) REFERENCES shop_slots(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
