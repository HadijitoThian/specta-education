CREATE TABLE `social_media_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('facebook','instagram','tiktok') NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accountId` varchar(255) NOT NULL,
	`accessToken` text,
	`tokenExpiresAt` timestamp,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`connectedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `social_media_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_media_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brief` text NOT NULL,
	`caption` text NOT NULL,
	`imageUrl` text,
	`videoUrl` text,
	`platforms` varchar(255) NOT NULL,
	`status` enum('draft','scheduled','publishing','published','failed') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`facebookPostId` varchar(255),
	`instagramPostId` varchar(255),
	`errorMessage` text,
	`createdBy` varchar(255) NOT NULL,
	`contentType` enum('image','reel','text') NOT NULL DEFAULT 'image',
	`hashtags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `social_media_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_media_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('scholarship','destination','ielts','testimonial','promo','general') NOT NULL,
	`promptTemplate` text NOT NULL,
	`exampleImageUrl` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `social_media_templates_id` PRIMARY KEY(`id`)
);
