ALTER TABLE `leads` MODIFY COLUMN `studentPhone` varchar(50);--> statement-breakpoint
ALTER TABLE `leads` ADD `intentSummary` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `chatTranscript` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `source` varchar(50) DEFAULT 'chatbot';--> statement-breakpoint
ALTER TABLE `leads` ADD `isAnonymous` boolean DEFAULT false;