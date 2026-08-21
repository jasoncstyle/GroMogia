ALTER TABLE "builder_sites" ADD COLUMN "template_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "builder_sites" SET "template_id" = '1' WHERE "template_id" = '';
