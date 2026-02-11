CREATE TABLE `staffAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` enum('admin','counselor','staff') NOT NULL DEFAULT 'staff',
	`mustChangePassword` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staffAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `staffAccounts_email_unique` UNIQUE(`email`)
);
