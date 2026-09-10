ALTER TABLE "growth_actions" ADD COLUMN IF NOT EXISTS "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "growth_actions" ADD COLUMN IF NOT EXISTS "evidence" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "growth_actions" ADD COLUMN IF NOT EXISTS "confidence" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "growth_actions" ADD COLUMN IF NOT EXISTS "expected_impact" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "growth_actions" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 0 NOT NULL;
