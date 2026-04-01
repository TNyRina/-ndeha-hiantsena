CREATE TABLE `categories` (
	`id_category` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label_category` text NOT NULL,
	`rate` integer NOT NULL,
	CONSTRAINT "rate_positive" CHECK("categories"."rate" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_label_category_unique` ON `categories` (`label_category`);--> statement-breakpoint
CREATE TABLE `market_prices` (
	`id_market` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id_product` integer NOT NULL,
	`id_seller` integer NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`id_product`) REFERENCES `products`(`id_product`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`id_seller`) REFERENCES `sellers`(`id_seller`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `panniers` (
	`id_pannier` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`budget` real DEFAULT 0 NOT NULL,
	`optimized_price` real DEFAULT 0 NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id_product` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label_product` text NOT NULL,
	`id_category` integer,
	`id_unit` integer,
	FOREIGN KEY (`id_category`) REFERENCES `categories`(`id_category`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`id_unit`) REFERENCES `units`(`id_unit`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_label_product_unique` ON `products` (`label_product`);--> statement-breakpoint
CREATE TABLE `sellers` (
	`id_seller` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_seller` text NOT NULL,
	`localisation` text
);
--> statement-breakpoint
CREATE TABLE `shopping_list` (
	`id_shopping` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id_pannier` integer NOT NULL,
	`id_market` integer,
	`quantity_requested` real NOT NULL,
	`state` text,
	FOREIGN KEY (`id_pannier`) REFERENCES `panniers`(`id_pannier`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`id_market`) REFERENCES `market_prices`(`id_market`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id_unit` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label_unit` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `units_label_unit_unique` ON `units` (`label_unit`);