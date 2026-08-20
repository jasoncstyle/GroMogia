CREATE TABLE "seo_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid,
	"url" text NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seo_audits_org_idx" ON "seo_audits" USING btree ("organization_id");