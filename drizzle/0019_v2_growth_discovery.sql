ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "confidence" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "discovery_status" text DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "inferred_from" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "growth_goals" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "growth_goals" ADD COLUMN IF NOT EXISTS "confidence" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "growth_goals" ADD COLUMN IF NOT EXISTS "discovery_status" text DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE "growth_goals" ADD COLUMN IF NOT EXISTS "inferred_from" text DEFAULT '' NOT NULL;
