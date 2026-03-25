CREATE TABLE `student_ai_chat_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_ai_chat_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_portal_appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`studentName` varchar(255) NOT NULL,
	`studentEmail` varchar(320) NOT NULL,
	`appointmentDate` varchar(20) NOT NULL,
	`appointmentTime` varchar(10) NOT NULL,
	`sessionType` enum('initial_consultation','application_review','visa_guidance','scholarship_advice','general_inquiry') NOT NULL DEFAULT 'initial_consultation',
	`notes` text,
	`status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`counselorNotes` text,
	`meetingLink` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_portal_appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_portal_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`avatarUrl` varchar(1024),
	`avatarKey` varchar(512),
	`bio` text,
	`intakeMonth` varchar(20),
	`intakeYear` varchar(10),
	`dreamCountry` varchar(100),
	`dreamProgram` varchar(255),
	`motivationNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_portal_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_portal_profiles_leadId_unique` UNIQUE(`leadId`)
);
--> statement-breakpoint
CREATE TABLE `student_university_wishlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`universityName` varchar(255) NOT NULL,
	`country` varchar(100) NOT NULL,
	`program` varchar(255),
	`notes` text,
	`ranking` varchar(50),
	`tuitionFee` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_university_wishlist_id` PRIMARY KEY(`id`)
);
