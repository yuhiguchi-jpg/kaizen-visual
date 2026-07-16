CREATE TABLE `scheduled_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobKey` varchar(64) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduled_jobs_job_key_unique` UNIQUE(`jobKey`),
	CONSTRAINT `scheduled_jobs_task_uid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_notification_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobKey` varchar(64) NOT NULL,
	`businessDate` varchar(10) NOT NULL,
	`status` enum('pending','sent','skipped','failed') NOT NULL DEFAULT 'pending',
	`recipientCount` int NOT NULL DEFAULT 0,
	`messageId` varchar(128),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_notification_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduled_notification_runs_job_date_unique` UNIQUE(`jobKey`,`businessDate`)
);
--> statement-breakpoint
CREATE INDEX `scheduled_notification_runs_status_idx` ON `scheduled_notification_runs` (`status`);