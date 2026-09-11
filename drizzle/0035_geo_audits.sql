CREATE TABLE IF NOT EXISTS "geo_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"query_id" uuid NOT NULL,
	"query_key" text DEFAULT '' NOT NULL,
	"query" text NOT NULL,
	"history_id" uuid,
	"mentioned" text NOT NULL,
	"cited" text NOT NULL,
	"status" text DEFAULT 'citation_gap' NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'stored_history' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_audits" ADD CONSTRAINT "geo_audits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_audits" ADD CONSTRAINT "geo_audits_query_id_geo_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."geo_queries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_audits" ADD CONSTRAINT "geo_audits_history_id_geo_history_id_fk" FOREIGN KEY ("history_id") REFERENCES "public"."geo_history"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "geo_audits_org_query_idx" ON "geo_audits" USING btree ("organization_id","query_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_audits_org_idx" ON "geo_audits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_audits_org_status_idx" ON "geo_audits" USING btree ("organization_id","status");
