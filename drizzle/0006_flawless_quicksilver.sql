CREATE TABLE `studio_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`product` text NOT NULL,
	`task_id` text NOT NULL,
	`step_key` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`data` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE INDEX `studio_jobs_task_created_idx` ON `studio_jobs` (`task_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `studio_jobs_status_idx` ON `studio_jobs` (`status`);