CREATE TABLE `personaResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentName` varchar(255),
	`studentEmail` varchar(320),
	`answers` text NOT NULL,
	`personaName` varchar(255) NOT NULL,
	`personaData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personaResults_id` PRIMARY KEY(`id`)
);
