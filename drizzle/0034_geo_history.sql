CREATE TABLE IF NOT EXISTS "geo_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"query_id" uuid NOT NULL,
	"query_key" text DEFAULT '' NOT NULL,
	"query" text NOT NULL,
	"mentioned" text NOT NULL,
	"cited" text DEFAULT 'unsure' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'owner' NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_history" ADD CONSTRAINT "geo_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_history" ADD CONSTRAINT "geo_history_query_id_geo_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."geo_queries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_history" ADD CONSTRAINT "geo_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_history_org_idx" ON "geo_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_history_org_query_idx" ON "geo_history" USING btree ("organization_id","query_id");
