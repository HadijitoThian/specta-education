CREATE TABLE `agent_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(100) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`settings` text,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`runIntervalMinutes` int NOT NULL DEFAULT 60,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_configs_agentName_unique` UNIQUE(`agentName`)
);
--> statement-breakpoint
CREATE TABLE `agent_run_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(100) NOT NULL,
	`status` enum('running','success','failed','partial') NOT NULL DEFAULT 'running',
	`summary` text,
	`details` text,
	`itemsProcessed` int NOT NULL DEFAULT 0,
	`itemsSucceeded` int NOT NULL DEFAULT 0,
	`itemsFailed` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`durationMs` int,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_run_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportDate` varchar(20) NOT NULL,
	`reportType` enum('daily_summary','weekly_summary','monthly_summary') NOT NULL DEFAULT 'daily_summary',
	`htmlContent` text NOT NULL,
	`summary` text,
	`metrics` text,
	`sentTo` varchar(320) NOT NULL,
	`sentAt` timestamp,
	`status` enum('generated','sent','failed') NOT NULL DEFAULT 'generated',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follow_up_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`actionType` enum('email_student','email_counselor','escalation','reminder') NOT NULL,
	`dayOffset` int NOT NULL,
	`subject` varchar(500),
	`content` text,
	`status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`scheduledAt` timestamp NOT NULL,
	`sentAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follow_up_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`leadSource` varchar(50) NOT NULL,
	`counselorId` int NOT NULL,
	`counselorName` varchar(255) NOT NULL,
	`counselorEmail` varchar(320) NOT NULL,
	`studentName` varchar(255) NOT NULL,
	`studentEmail` varchar(320),
	`studentPhone` varchar(50),
	`preferredCountry` varchar(100),
	`status` enum('assigned','contacted','follow_up','qualified','converted','closed','escalated') NOT NULL DEFAULT 'assigned',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`lastContactedAt` timestamp,
	`nextFollowUpAt` timestamp,
	`followUpCount` int NOT NULL DEFAULT 0,
	`escalatedAt` timestamp,
	`escalationReason` text,
	`notes` text,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lead_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_content_calendar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetKeyword` varchar(255) NOT NULL,
	`secondaryKeywords` text,
	`title` varchar(500),
	`titleId` varchar(500),
	`slug` varchar(500),
	`contentBrief` text,
	`language` enum('id','en') NOT NULL DEFAULT 'id',
	`category` varchar(100),
	`status` enum('planned','generating','generated','review','published','failed') NOT NULL DEFAULT 'planned',
	`blogPostId` int,
	`scheduledDate` varchar(20),
	`publishedAt` timestamp,
	`searchVolume` int,
	`difficulty` varchar(20),
	`agentRunId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_content_calendar_id` PRIMARY KEY(`id`)
);
