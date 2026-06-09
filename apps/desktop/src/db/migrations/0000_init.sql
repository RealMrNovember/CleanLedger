CREATE TABLE IF NOT EXISTS `products` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `icon_name` text NOT NULL,
  `base_price` real NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS `orders` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `order_number` text NOT NULL UNIQUE,
  `customer_phone` text NOT NULL,
  `total_amount` real DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'received' NOT NULL,
  `created_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `order_id` integer NOT NULL,
  `product_id` integer NOT NULL,
  `service_type` text NOT NULL,
  `subtotal` real NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
);
