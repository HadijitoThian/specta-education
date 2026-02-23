CREATE TABLE `simulatorChoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`day` int NOT NULL,
	`scenarioType` varchar(100) NOT NULL,
	`scenarioText` text NOT NULL,
	`choiceOptions` text NOT NULL,
	`selectedChoice` varchar(10) NOT NULL,
	`choiceText` text NOT NULL,
	`aiResponse` text NOT NULL,
	`impactBudget` int NOT NULL DEFAULT 0,
	`impactMood` int NOT NULL DEFAULT 0,
	`impactConnections` int NOT NULL DEFAULT 0,
	`impactAcademic` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulatorChoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulatorResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`readinessScore` int NOT NULL,
	`socialScore` int NOT NULL,
	`financialScore` int NOT NULL,
	`academicScore` int NOT NULL,
	`emotionalScore` int NOT NULL,
	`strengths` text NOT NULL,
	`weaknesses` text NOT NULL,
	`recommendations` text NOT NULL,
	`reportSent` boolean NOT NULL DEFAULT false,
	`bookedConsultation` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulatorResults_id` PRIMARY KEY(`id`),
	CONSTRAINT `simulatorResults_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `simulatorSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`studentName` varchar(255) NOT NULL,
	`studentEmail` varchar(320) NOT NULL,
	`studentPhone` varchar(50),
	`country` varchar(100) NOT NULL,
	`universityTier` varchar(50) NOT NULL,
	`intendedMajor` varchar(255) NOT NULL,
	`budgetLevel` varchar(50) NOT NULL,
	`personalityType` varchar(100),
	`currentDay` int NOT NULL DEFAULT 1,
	`status` enum('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `simulatorSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `simulatorSessions_sessionId_unique` UNIQUE(`sessionId`)
);
