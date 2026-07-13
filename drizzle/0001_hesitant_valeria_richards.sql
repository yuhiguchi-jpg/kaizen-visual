CREATE TABLE `improvement_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`originalMethod` text NOT NULL,
	`problem` text NOT NULL,
	`beforeMinutes` int NOT NULL,
	`solution` text NOT NULL,
	`afterMinutes` int NOT NULL,
	`imageUrl` text,
	`imagePrompt` text,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`generatedAt` timestamp,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `improvement_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insight_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightId` int NOT NULL,
	`userId` int NOT NULL,
	`reaction` enum('spark','agree','thanks','idea') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `insight_reactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `insight_reaction_unique` UNIQUE(`insightId`,`userId`,`reaction`)
);
--> statement-breakpoint
CREATE TABLE `insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `improvement_cases` ADD CONSTRAINT `improvement_cases_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insight_reactions` ADD CONSTRAINT `insight_reactions_insightId_insights_id_fk` FOREIGN KEY (`insightId`) REFERENCES `insights`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insight_reactions` ADD CONSTRAINT `insight_reactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insights` ADD CONSTRAINT `insights_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `improvement_cases_author_idx` ON `improvement_cases` (`authorId`);--> statement-breakpoint
CREATE INDEX `improvement_cases_status_idx` ON `improvement_cases` (`status`);--> statement-breakpoint
CREATE INDEX `improvement_cases_published_idx` ON `improvement_cases` (`publishedAt`);--> statement-breakpoint
CREATE INDEX `insight_reactions_insight_idx` ON `insight_reactions` (`insightId`);--> statement-breakpoint
CREATE INDEX `insight_reactions_user_idx` ON `insight_reactions` (`userId`);--> statement-breakpoint
CREATE INDEX `insights_author_idx` ON `insights` (`authorId`);--> statement-breakpoint
CREATE INDEX `insights_created_idx` ON `insights` (`createdAt`);