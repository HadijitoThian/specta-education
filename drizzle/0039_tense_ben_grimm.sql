CREATE TABLE `student_referral_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`totalReferrals` int NOT NULL DEFAULT 0,
	`completedReferrals` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_referral_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_referral_codes_leadId_unique` UNIQUE(`leadId`),
	CONSTRAINT `student_referral_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `student_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerLeadId` int NOT NULL,
	`referralCode` varchar(20) NOT NULL,
	`friendName` varchar(255),
	`friendEmail` varchar(320) NOT NULL,
	`friendPhone` varchar(50),
	`status` enum('pending','signed_up','booked_session','completed') NOT NULL DEFAULT 'pending',
	`signedUpAt` timestamp,
	`bookedSessionAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_rewards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`referralId` int NOT NULL,
	`rewardType` enum('ielts_mock_test','priority_session','scholarship_guide','application_fee_waiver') NOT NULL,
	`rewardLabel` varchar(255) NOT NULL,
	`status` enum('pending','claimed','redeemed') NOT NULL DEFAULT 'pending',
	`claimedAt` timestamp,
	`redeemedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_rewards_id` PRIMARY KEY(`id`)
);
