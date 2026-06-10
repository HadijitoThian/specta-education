CREATE TABLE `ieltsListeningAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int NOT NULL,
	`studentAnswer` text,
	`isCorrect` boolean,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ieltsListeningAnswers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsListeningQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectionId` int NOT NULL,
	`questionNumber` tinyint NOT NULL,
	`questionType` enum('mcq','multi_select','matching','map_labelling','form_completion','note_completion','sentence_completion','summary_completion','short_answer') NOT NULL,
	`prompt` text NOT NULL,
	`options` json,
	`correctAnswers` json NOT NULL,
	`maxScore` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `ieltsListeningQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsListeningSections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`sectionNumber` tinyint NOT NULL,
	`audioKey` varchar(512) NOT NULL,
	`durationSec` int,
	`transcript` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ieltsListeningSections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsMockAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`testId` int NOT NULL,
	`attemptToken` varchar(32) NOT NULL,
	`paymentRef` varchar(128),
	`paidAt` timestamp,
	`status` enum('awaiting_payment','ready','listening','reading','writing','speaking','grading','completed','abandoned') NOT NULL DEFAULT 'awaiting_payment',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ieltsMockAttempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `ieltsMockAttempts_attemptToken_unique` UNIQUE(`attemptToken`)
);
--> statement-breakpoint
CREATE TABLE `ieltsMockScores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`listeningBand` decimal(2,1),
	`listeningRawScore` int,
	`readingBand` decimal(2,1),
	`readingRawScore` int,
	`writingBand` decimal(2,1),
	`speakingBand` decimal(2,1),
	`overallBand` decimal(2,1),
	`reportPdfKey` varchar(512),
	`reportSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ieltsMockScores_id` PRIMARY KEY(`id`),
	CONSTRAINT `ieltsMockScores_attemptId_unique` UNIQUE(`attemptId`)
);
--> statement-breakpoint
CREATE TABLE `ieltsMockTests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`title` varchar(200) NOT NULL,
	`testType` enum('academic','general') NOT NULL,
	`isPublished` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ieltsMockTests_id` PRIMARY KEY(`id`),
	CONSTRAINT `ieltsMockTests_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `ieltsReadingAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int NOT NULL,
	`studentAnswer` text,
	`isCorrect` boolean,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ieltsReadingAnswers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsReadingPassages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`passageNumber` tinyint NOT NULL,
	`title` varchar(300) NOT NULL,
	`body` text NOT NULL,
	`wordCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ieltsReadingPassages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsReadingQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`passageId` int NOT NULL,
	`questionNumber` tinyint NOT NULL,
	`questionType` enum('tfng','ynng','mcq','matching_headings','matching_information','matching_features','matching_sentence_endings','sentence_completion','summary_completion','note_completion','table_completion','flowchart_completion','diagram_labelling','short_answer') NOT NULL,
	`prompt` text NOT NULL,
	`options` json,
	`correctAnswers` json NOT NULL,
	`maxScore` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `ieltsReadingQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsSpeakingConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`partNumber` tinyint NOT NULL,
	`turnOrder` int NOT NULL,
	`role` enum('examiner','student') NOT NULL,
	`text` text NOT NULL,
	`audioKey` varchar(512),
	`spokenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ieltsSpeakingConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsSpeakingPrompts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`partNumber` tinyint NOT NULL,
	`promptOrder` tinyint NOT NULL,
	`prompt` text NOT NULL,
	`cueCardText` text,
	`followUpHint` text,
	CONSTRAINT `ieltsSpeakingPrompts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsSpeakingResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`partNumber` tinyint NOT NULL,
	`audioKey` varchar(512),
	`transcript` text,
	`scoreFC` decimal(2,1),
	`scoreLR` decimal(2,1),
	`scoreGRA` decimal(2,1),
	`scoreP` decimal(2,1),
	`partBand` decimal(2,1),
	`feedback` json,
	`gradedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `ieltsSpeakingResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsWritingResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`taskId` int NOT NULL,
	`studentText` text NOT NULL,
	`wordCount` int NOT NULL,
	`scoreTA` decimal(2,1),
	`scoreCC` decimal(2,1),
	`scoreLR` decimal(2,1),
	`scoreGRA` decimal(2,1),
	`taskBand` decimal(2,1),
	`feedback` json,
	`gradedAt` timestamp,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ieltsWritingResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ieltsWritingTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`taskNumber` tinyint NOT NULL,
	`taskFormat` enum('chart','letter','essay') NOT NULL,
	`prompt` text NOT NULL,
	`imageKey` varchar(512),
	`minWords` int NOT NULL,
	`timeLimitSec` int NOT NULL,
	CONSTRAINT `ieltsWritingTasks_id` PRIMARY KEY(`id`)
);
