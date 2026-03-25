CREATE TABLE `student_visa_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`visaType` varchar(100),
	`visaStatus` varchar(100) DEFAULT 'not_started',
	`embassy` varchar(200),
	`applicationDate` timestamp,
	`biometricsDate` timestamp,
	`decisionDate` timestamp,
	`visaExpiryDate` timestamp,
	`requiredDocs` text,
	`completedDocs` text,
	`notes` text,
	`staffEmail` varchar(320) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_visa_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `universities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(300) NOT NULL,
	`country` varchar(100) NOT NULL,
	`city` varchar(150),
	`ranking` int,
	`website` varchar(500),
	`programs` text,
	`type` varchar(50) DEFAULT 'public',
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `universities_id` PRIMARY KEY(`id`)
);
