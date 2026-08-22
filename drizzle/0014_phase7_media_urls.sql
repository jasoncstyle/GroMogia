ALTER TABLE "media_assets" ADD COLUMN "public_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "original_name" text DEFAULT '' NOT NULL;
