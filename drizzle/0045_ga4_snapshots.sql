INSERT INTO "integration_providers" ("key", "name", "capabilities")
VALUES ('google_analytics', 'Google Analytics', '["analytics"]'::jsonb)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "ga4_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_id" text NOT NULL,
	"property_name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"totals" jsonb DEFAULT '{"sessions":0,"activeUsers":0}'::jsonb NOT NULL,
	"top_pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"top_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ga4_snapshots" ADD CONSTRAINT "ga4_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ga4_snapshots" ADD CONSTRAINT "ga4_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ga4_snapshots_org_idx" ON "ga4_snapshots" USING btree ("organization_id");
