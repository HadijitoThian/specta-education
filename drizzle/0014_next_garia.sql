CREATE TABLE `aptitudeProOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(128) NOT NULL,
	`xenditInvoiceId` varchar(128),
	`xenditInvoiceUrl` varchar(512),
	`customerName` varchar(255) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(50),
	`amount` int NOT NULL,
	`status` enum('pending','paid','expired','failed') NOT NULL DEFAULT 'pending',
	`accessTokenId` int,
	`paidAt` timestamp,
	`source` varchar(50) NOT NULL DEFAULT 'landing',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aptitudeProOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `aptitudeProOrders_externalId_unique` UNIQUE(`externalId`)
);
