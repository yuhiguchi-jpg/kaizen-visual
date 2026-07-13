ALTER TABLE `improvement_cases` ADD `workUrl` text;--> statement-breakpoint
ALTER TABLE `insights` ADD `genre` varchar(64) DEFAULT '業務プロセス改善' NOT NULL;--> statement-breakpoint
CREATE INDEX `insights_genre_idx` ON `insights` (`genre`);