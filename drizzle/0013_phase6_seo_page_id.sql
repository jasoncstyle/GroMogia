ALTER TABLE "seo_audits" ADD COLUMN "builder_site_id" uuid;--> statement-breakpoint
ALTER TABLE "seo_drafts" ADD COLUMN "builder_site_id" uuid;--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_builder_site_id_builder_sites_id_fk" FOREIGN KEY ("builder_site_id") REFERENCES "public"."builder_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_drafts" ADD CONSTRAINT "seo_drafts_builder_site_id_builder_sites_id_fk" FOREIGN KEY ("builder_site_id") REFERENCES "public"."builder_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seo_audits_page_idx" ON "seo_audits" USING btree ("builder_site_id");--> statement-breakpoint
CREATE INDEX "seo_drafts_page_idx" ON "seo_drafts" USING btree ("builder_site_id");
