CREATE TABLE `crm_chat_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`staffEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_chat_history_id` PRIMARY KEY(`id`)
);
