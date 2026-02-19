CREATE TABLE `dripCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`triggerSource` enum('aptitude_test','contact_form','scholarship_form','quiz','manual','pro_purchase') NOT NULL DEFAULT 'manual',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dripCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dripEmailLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollmentId` int NOT NULL,
	`stepId` int NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`status` enum('sent','failed','bounced') NOT NULL DEFAULT 'sent',
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dripEmailLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dripEmailSteps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`stepOrder` int NOT NULL,
	`subject` varchar(500) NOT NULL,
	`htmlContent` text NOT NULL,
	`delayDays` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dripEmailSteps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dripEnrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`contactPhone` varchar(50),
	`source` varchar(100),
	`currentStepOrder` int NOT NULL DEFAULT 0,
	`status` enum('active','completed','unsubscribed','paused') NOT NULL DEFAULT 'active',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`lastEmailSentAt` timestamp,
	`nextSendAt` timestamp,
	`completedAt` timestamp,
	`unsubscribedAt` timestamp,
	`unsubscribeToken` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dripEnrollments_id` PRIMARY KEY(`id`)
);
