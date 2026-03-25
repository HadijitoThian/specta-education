CREATE TABLE `crm_activity_timeline` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`activityType` varchar(100) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`staffEmail` varchar(320),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_activity_timeline_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`studentName` varchar(255) NOT NULL,
	`studentEmail` varchar(320),
	`studentPhone` varchar(50),
	`staffEmail` varchar(320) NOT NULL,
	`staffName` varchar(255),
	`appointmentType` enum('initial_consultation','follow_up','document_review','offer_discussion','visa_prep','other') NOT NULL DEFAULT 'initial_consultation',
	`scheduledAt` timestamp NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 30,
	`location` varchar(255),
	`meetingLink` text,
	`status` enum('scheduled','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`reminderSent` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffEmail` varchar(320) NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(500) NOT NULL,
	`message` text,
	`leadId` int,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`actionUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_student_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`docType` varchar(100) NOT NULL,
	`docLabel` varchar(255) NOT NULL,
	`status` enum('pending','submitted','verified','rejected') NOT NULL DEFAULT 'pending',
	`fileUrl` text,
	`notes` text,
	`dueDate` timestamp,
	`submittedAt` timestamp,
	`verifiedAt` timestamp,
	`staffEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_student_documents_id` PRIMARY KEY(`id`)
);
