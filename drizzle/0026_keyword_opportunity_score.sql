ALTER TABLE "keywords" ADD COLUMN IF NOT EXISTS "opportunity_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "keywords" ADD COLUMN IF NOT EXISTS "opportunity_label" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "keywords" ADD COLUMN IF NOT EXISTS "opportunity_why" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "keywords" ADD COLUMN IF NOT EXISTS "scored_at" timestamp with time zone;
