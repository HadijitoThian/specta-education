ALTER TABLE `leads` MODIFY COLUMN `conversationId` int;--> statement-breakpoint
ALTER TABLE `leads` ADD `assignedCounselor` varchar(255);--> statement-breakpoint
ALTER TABLE `leads` ADD `programInterest` varchar(255);