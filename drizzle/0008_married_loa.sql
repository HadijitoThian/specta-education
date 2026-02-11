CREATE TABLE `scholarshipLeads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentName` varchar(255) NOT NULL,
	`studentEmail` varchar(320) NOT NULL,
	`studentPhone` varchar(50) NOT NULL,
	`educationLevel` varchar(100) NOT NULL,
	`gpa` varchar(10) NOT NULL,
	`scholarshipInterest` varchar(100) NOT NULL,
	`ieltsStatus` varchar(50) NOT NULL,
	`ieltsScore` varchar(10),
	`status` enum('new','contacted','qualified','converted','closed') NOT NULL DEFAULT 'new',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scholarshipLeads_id` PRIMARY KEY(`id`)
);
