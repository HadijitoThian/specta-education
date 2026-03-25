CREATE TABLE `staff_team_chat` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderEmail` varchar(320) NOT NULL,
	`senderName` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`channel` varchar(100) NOT NULL DEFAULT 'general',
	`replyToId` int,
	`isEdited` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_team_chat_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`universityName` varchar(500) NOT NULL,
	`programName` varchar(500) NOT NULL,
	`country` varchar(100),
	`intakePeriod` varchar(100),
	`applicationStatus` varchar(50) NOT NULL DEFAULT 'preparing',
	`submittedAt` timestamp,
	`offerReceivedAt` timestamp,
	`offerDeadline` timestamp,
	`tuitionFee` varchar(100),
	`scholarshipInfo` text,
	`notes` text,
	`staffEmail` varchar(320) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_applications_id` PRIMARY KEY(`id`)
);
