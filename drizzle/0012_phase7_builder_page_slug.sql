ALTER TABLE "builder_sites" ADD COLUMN "slug" text DEFAULT '' NOT NULL;--> statement-breakpoint
DROP INDEX "builder_sites_org_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "builder_sites_org_slug_idx" ON "builder_sites" USING btree ("organization_id","slug");
