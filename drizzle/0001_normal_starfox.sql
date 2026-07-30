CREATE TABLE `image_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`parent_id` text,
	`model_id` text NOT NULL,
	`prompt` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `chats` ADD `working_image_asset_id` text;