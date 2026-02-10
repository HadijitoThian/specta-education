CREATE TABLE `quizResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentName` varchar(255),
	`studentEmail` varchar(320),
	`studentPhone` varchar(50),
	`answers` text NOT NULL,
	`matchedCountries` text NOT NULL,
	`topMatch` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizResults_id` PRIMARY KEY(`id`)
);
