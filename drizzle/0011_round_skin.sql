CREATE TABLE `aptitudeAccessTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`status` enum('unused','in_progress','completed','expired') NOT NULL DEFAULT 'unused',
	`expiresAt` timestamp NOT NULL,
	`usedByName` varchar(255),
	`usedByEmail` varchar(320),
	`usedByPhone` varchar(50),
	`usedAt` timestamp,
	`completedAt` timestamp,
	`resultId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aptitudeAccessTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `aptitudeAccessTokens_token_unique` UNIQUE(`token`)
);
