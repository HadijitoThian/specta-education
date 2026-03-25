CREATE TABLE `student_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(500) NOT NULL,
	`message` text,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`actionTab` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_notifications_id` PRIMARY KEY(`id`)
);
