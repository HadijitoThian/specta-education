CREATE TABLE `applicationDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(100) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`documentType` enum('transcript','passport','ielts','certificate','offer_letter','visa','other') NOT NULL DEFAULT 'other',
	`uploadedBy` enum('student','counselor') NOT NULL DEFAULT 'student',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `applicationDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `applicationNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`authorName` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `applicationNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`date` varchar(20) NOT NULL,
	`timeSlot` varchar(20) NOT NULL,
	`consultationType` enum('general','ielts','university','visa','scholarship') NOT NULL DEFAULT 'general',
	`preferredCountry` varchar(100),
	`notes` text,
	`status` enum('pending','confirmed','completed','cancelled','rescheduled') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsPracticeResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentName` varchar(255) NOT NULL,
	`studentEmail` varchar(320) NOT NULL,
	`studentPhone` varchar(50),
	`section` enum('reading','writing','listening','speaking') NOT NULL,
	`questions` text NOT NULL,
	`answers` text NOT NULL,
	`score` varchar(10),
	`aiFeedback` text,
	`timeTaken` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ieltsPracticeResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trackingTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trackingTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `trackingTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `applications` MODIFY COLUMN `status` enum('submitted','reviewing','processing','on_hold','offer_received','accepted','enrolled','rejected') NOT NULL DEFAULT 'submitted';--> statement-breakpoint
ALTER TABLE `applications` ADD `referenceNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `applications` ADD `assignedCounselor` varchar(255);--> statement-breakpoint
ALTER TABLE `applications` ADD `universityResponse` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `statusHistory` text;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_referenceNumber_unique` UNIQUE(`referenceNumber`);