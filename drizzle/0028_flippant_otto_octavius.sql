CREATE TABLE `gm_executive_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportDate` varchar(20) NOT NULL,
	`totalAgents` int NOT NULL DEFAULT 0,
	`healthyAgents` int NOT NULL DEFAULT 0,
	`warningAgents` int NOT NULL DEFAULT 0,
	`criticalAgents` int NOT NULL DEFAULT 0,
	`autoHealedCount` int NOT NULL DEFAULT 0,
	`metricsSnapshot` text,
	`executiveSummary` text NOT NULL,
	`operationsReport` text NOT NULL,
	`recommendationsJson` text,
	`competitorAlerts` text,
	`seoInsights` text,
	`leadInsights` text,
	`partnershipInsights` text,
	`htmlContent` text,
	`sentTo` varchar(320),
	`sentAt` timestamp,
	`status` enum('generated','sent','failed') NOT NULL DEFAULT 'generated',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gm_executive_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gm_health_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checkAt` timestamp NOT NULL DEFAULT (now()),
	`cycleLabel` varchar(50) NOT NULL,
	`agentName` varchar(100) NOT NULL,
	`agentDisplayName` varchar(255) NOT NULL,
	`status` enum('healthy','warning','critical','missed','recovered') NOT NULL,
	`lastRunAt` timestamp,
	`expectedRunAt` timestamp,
	`wasAutoHealed` boolean NOT NULL DEFAULT false,
	`errorSummary` text,
	`outputSummary` text,
	`healthScore` int NOT NULL DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gm_health_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gm_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportDate` varchar(20) NOT NULL,
	`category` enum('competitor_response','seo_improvement','lead_generation','university_partnership','student_engagement','operational_fix','strategic_opportunity') NOT NULL,
	`priority` enum('urgent','high','medium','low') NOT NULL DEFAULT 'medium',
	`title` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`rationale` text,
	`suggestedAction` text,
	`dataSource` varchar(255),
	`status` enum('pending','acknowledged','in_progress','done','dismissed') NOT NULL DEFAULT 'pending',
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gm_recommendations_id` PRIMARY KEY(`id`)
);
