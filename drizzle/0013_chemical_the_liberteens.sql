CREATE TABLE `checklistItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phase` enum('12_months','9_months','6_months','3_months','1_month','2_weeks','departure') NOT NULL,
	`category` enum('documents','tests','applications','visa','accommodation','finances','travel','health') NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleId` varchar(255),
	`description` text,
	`descriptionId` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checklistItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `costOfLivingData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`country` varchar(100) NOT NULL,
	`countrySlug` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`category` enum('rent','food','transport','utilities','entertainment','tuition') NOT NULL,
	`amountMinUsd` int NOT NULL,
	`amountMaxUsd` int NOT NULL,
	`localCurrency` varchar(10) NOT NULL,
	`amountMinLocal` int NOT NULL,
	`amountMaxLocal` int NOT NULL,
	`notes` text,
	`notesId` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `costOfLivingData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userChecklistProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`checklistItemId` int NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userChecklistProgress_id` PRIMARY KEY(`id`)
);
