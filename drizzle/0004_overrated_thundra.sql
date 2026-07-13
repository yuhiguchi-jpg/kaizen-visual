CREATE TABLE `insight_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `insight_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insight_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `insight_likes_id` PRIMARY KEY(`id`),
	CONSTRAINT `insight_like_unique` UNIQUE(`insightId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `insight_comments` ADD CONSTRAINT `insight_comments_insightId_insights_id_fk` FOREIGN KEY (`insightId`) REFERENCES `insights`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insight_comments` ADD CONSTRAINT `insight_comments_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insight_likes` ADD CONSTRAINT `insight_likes_insightId_insights_id_fk` FOREIGN KEY (`insightId`) REFERENCES `insights`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insight_likes` ADD CONSTRAINT `insight_likes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `insight_comments_insight_idx` ON `insight_comments` (`insightId`);--> statement-breakpoint
CREATE INDEX `insight_comments_author_idx` ON `insight_comments` (`authorId`);--> statement-breakpoint
CREATE INDEX `insight_comments_created_idx` ON `insight_comments` (`createdAt`);--> statement-breakpoint
CREATE INDEX `insight_likes_insight_idx` ON `insight_likes` (`insightId`);--> statement-breakpoint
CREATE INDEX `insight_likes_user_idx` ON `insight_likes` (`userId`);--> statement-breakpoint
INSERT IGNORE INTO `insight_likes` (`insightId`, `userId`, `createdAt`)
SELECT `insightId`, `userId`, MIN(`createdAt`)
FROM `insight_reactions`
GROUP BY `insightId`, `userId`;
