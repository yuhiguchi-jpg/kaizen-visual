ALTER TABLE `improvement_cases` ADD `beforeSeconds` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `improvement_cases` ADD `afterSeconds` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `improvement_cases` ADD `frequencyCount` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `improvement_cases` ADD `frequencyPeriod` enum('day','week','month','year') DEFAULT 'year' NOT NULL;