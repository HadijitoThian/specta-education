CREATE TABLE `ads_adsets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`platform` enum('google','meta') NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`externalCampaignId` varchar(255) NOT NULL,
	`name` varchar(500) NOT NULL,
	`status` enum('active','paused','removed','unknown') NOT NULL DEFAULT 'active',
	`targeting` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ads_adsets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ads_agent_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('google','meta') NOT NULL,
	`entityType` enum('campaign','adset') NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`entityName` varchar(500),
	`action` enum('pause','resume','scale_budget','generate_copy','alert_only') NOT NULL,
	`reason` text NOT NULL,
	`previousValue` varchar(255),
	`newValue` varchar(255),
	`status` enum('pending','executed','failed','skipped') NOT NULL DEFAULT 'pending',
	`emailSent` tinyint DEFAULT 0,
	`errorMessage` text,
	`executedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ads_agent_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ads_agent_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`autoMode` tinyint NOT NULL DEFAULT 1,
	`runIntervalHours` int NOT NULL DEFAULT 6,
	`redCplThreshold` varchar(50) DEFAULT '500000',
	`yellowCplThreshold` varchar(50) DEFAULT '250000',
	`redCtrThreshold` varchar(20) DEFAULT '0.5',
	`minSpendForAction` varchar(50) DEFAULT '100000',
	`scaleBudgetMultiplier` varchar(10) DEFAULT '1.3',
	`maxDailyBudgetCapIdr` varchar(50) DEFAULT '5000000',
	`notificationEmail` varchar(320) DEFAULT 'hadi@spectaeducation.com',
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`isEnabled` tinyint NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ads_agent_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ads_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('google','meta') NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`name` varchar(500) NOT NULL,
	`status` enum('active','paused','removed','unknown') NOT NULL DEFAULT 'active',
	`objective` varchar(255),
	`dailyBudgetMicros` varchar(50),
	`currency` varchar(10) DEFAULT 'IDR',
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ads_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ads_generated_copy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('google','meta') NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`entityName` varchar(500),
	`headline1` varchar(255),
	`headline2` varchar(255),
	`headline3` varchar(255),
	`description1` text,
	`description2` text,
	`primaryText` text,
	`callToAction` varchar(100),
	`targetAudience` text,
	`aiReasoning` text,
	`isApplied` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ads_generated_copy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ads_performance_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('google','meta') NOT NULL,
	`entityType` enum('campaign','adset') NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`snapshotDate` varchar(20) NOT NULL,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`spend` varchar(50) DEFAULT '0',
	`conversions` int DEFAULT 0,
	`leads` int DEFAULT 0,
	`ctr` varchar(20) DEFAULT '0',
	`cpc` varchar(50) DEFAULT '0',
	`cpl` varchar(50) DEFAULT '0',
	`roas` varchar(20) DEFAULT '0',
	`aiScore` enum('green','yellow','red'),
	`aiReasoning` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ads_performance_snapshots_id` PRIMARY KEY(`id`)
);
