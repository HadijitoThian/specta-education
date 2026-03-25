CREATE TABLE `consultation_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`staffName` varchar(255) NOT NULL,
	`relatedType` enum('lead','application') NOT NULL DEFAULT 'lead',
	`relatedId` int NOT NULL,
	`studentName` varchar(255) NOT NULL,
	`rawNote` text,
	`expandedNote` text,
	`consultationType` enum('call','whatsapp','in_person','email','online_meeting') NOT NULL DEFAULT 'call',
	`durationMinutes` int,
	`outcome` enum('positive','neutral','negative','no_answer') NOT NULL DEFAULT 'neutral',
	`nextStepAction` varchar(500),
	`nextStepDueDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consultation_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `counselor_performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`staffEmail` varchar(320) NOT NULL,
	`snapshotDate` varchar(20) NOT NULL,
	`leadsAssigned` int NOT NULL DEFAULT 0,
	`leadsContacted` int NOT NULL DEFAULT 0,
	`leadsQualified` int NOT NULL DEFAULT 0,
	`leadsConverted` int NOT NULL DEFAULT 0,
	`applicationsActive` int NOT NULL DEFAULT 0,
	`applicationsCompleted` int NOT NULL DEFAULT 0,
	`tasksCompleted` int NOT NULL DEFAULT 0,
	`tasksPending` int NOT NULL DEFAULT 0,
	`avgResponseTimeMinutes` int,
	`conversionRate` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `counselor_performance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`staffEmail` varchar(320) NOT NULL,
	`relatedType` enum('lead','application','general') NOT NULL DEFAULT 'lead',
	`relatedId` int,
	`relatedName` varchar(255),
	`title` varchar(500) NOT NULL,
	`description` text,
	`taskType` enum('call','whatsapp','email','document_request','follow_up','consultation','other') NOT NULL DEFAULT 'follow_up',
	`priority` enum('urgent','high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','done','skipped') NOT NULL DEFAULT 'pending',
	`dueDate` timestamp,
	`completedAt` timestamp,
	`isAiGenerated` boolean NOT NULL DEFAULT false,
	`aiReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_pipeline_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`stage` enum('new','contacted','qualified','enrolled','in_progress','completed','lost') NOT NULL DEFAULT 'new',
	`previousStage` enum('new','contacted','qualified','enrolled','in_progress','completed','lost'),
	`stageChangedAt` timestamp NOT NULL DEFAULT (now()),
	`stageChangedBy` varchar(255),
	`stageNote` text,
	`leadScore` int DEFAULT 50,
	`scoreReason` text,
	`nextActionDue` timestamp,
	`nextActionNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lead_pipeline_stages_id` PRIMARY KEY(`id`),
	CONSTRAINT `lead_pipeline_stages_leadId_unique` UNIQUE(`leadId`)
);
