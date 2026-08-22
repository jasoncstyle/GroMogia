ALTER TABLE "builder_chrome" ADD COLUMN IF NOT EXISTS "header_background_color" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "builder_chrome" ADD COLUMN IF NOT EXISTS "footer_background_color" text DEFAULT '' NOT NULL;
