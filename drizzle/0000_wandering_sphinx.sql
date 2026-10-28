CREATE TABLE `catalog_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_products` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subtitle` text NOT NULL,
	`description` text NOT NULL,
	`weight` text NOT NULL,
	`image` text NOT NULL,
	`image_small` text,
	`group_name` text DEFAULT 'standard' NOT NULL,
	`price` integer,
	`available` integer DEFAULT 1 NOT NULL,
	`published` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`last_update_id` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bot_sessions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bot_updates` (
	`id` integer PRIMARY KEY NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`lease` text NOT NULL,
	`lease_until` integer NOT NULL,
	`response` text,
	`delivered` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
