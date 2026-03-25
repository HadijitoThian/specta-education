CREATE TABLE `ai_followup_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`counselorEmail` varchar(320) NOT NULL,
	`leadId` int NOT NULL,
	`suggestionType` enum('overdue_followup','deadline_alert','missing_docs','rapport_checkin','application_update','visa_reminder') NOT NULL,
	`priority` enum('urgent','high','medium','low') DEFAULT 'medium',
	`title` varchar(500) NOT NULL,
	`aiMessage` text,
	`aiAdvice` text,
	`isActioned` tinyint DEFAULT 0,
	`actionedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_followup_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_portal_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`isVerified` tinyint DEFAULT 0,
	`verifyToken` varchar(128),
	`resetToken` varchar(128),
	`resetTokenExpiry` timestamp,
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_portal_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_portal_accounts_leadId_unique` UNIQUE(`leadId`),
	CONSTRAINT `student_portal_accounts_email_unique` UNIQUE(`email`)
);
