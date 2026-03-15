ALTER TABLE `university_partnerships` ADD `outreachEmailSubject` varchar(500);--> statement-breakpoint
ALTER TABLE `university_partnerships` ADD `outreachRecipientEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `university_partnerships` ADD `approvalStatus` enum('pending_draft','pending_approval','approved','rejected','sent','failed') DEFAULT 'pending_draft';--> statement-breakpoint
ALTER TABLE `university_partnerships` ADD `approvalToken` varchar(128);--> statement-breakpoint
ALTER TABLE `university_partnerships` ADD `approvalRequestedAt` timestamp;--> statement-breakpoint
ALTER TABLE `university_partnerships` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `university_partnerships` ADD `rejectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `university_partnerships` ADD `rejectionReason` text;