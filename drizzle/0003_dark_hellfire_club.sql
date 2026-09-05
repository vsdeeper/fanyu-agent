CREATE TABLE `product_retouch_task_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`step_key` text NOT NULL,
	`kind` text NOT NULL,
	`file_name` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `product_retouch_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_retouch_task_steps` (
	`task_id` text NOT NULL,
	`step_key` text NOT NULL,
	`snapshot_version` integer NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`task_id`, `step_key`),
	FOREIGN KEY (`task_id`) REFERENCES `product_retouch_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_retouch_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`workflow_version` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
