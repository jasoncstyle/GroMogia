ALTER TABLE "builder_sites" ADD COLUMN "theme" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "builder_rows" ADD COLUMN "background_color" text DEFAULT '' NOT NULL;
