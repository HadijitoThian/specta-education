CREATE TABLE `matchPrograms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`universityId` int NOT NULL,
	`programName` varchar(255) NOT NULL,
	`programNameId` varchar(255),
	`degreeLevel` enum('bachelor','master','doctorate','diploma') NOT NULL DEFAULT 'bachelor',
	`fieldOfStudy` varchar(255) NOT NULL,
	`fieldOfStudyId` varchar(255),
	`riasecCodes` varchar(20) NOT NULL,
	`miTypes` varchar(255) NOT NULL,
	`description` text,
	`descriptionId` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchPrograms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matchUniversities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameId` varchar(255),
	`country` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`description` text,
	`descriptionId` text,
	`logoUrl` text,
	`website` varchar(500),
	`tuitionMinUsd` int,
	`tuitionMaxUsd` int,
	`ieltsMin` varchar(10),
	`gpaMin` varchar(10),
	`scholarshipAvailable` boolean NOT NULL DEFAULT false,
	`ranking` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchUniversities_id` PRIMARY KEY(`id`)
);
