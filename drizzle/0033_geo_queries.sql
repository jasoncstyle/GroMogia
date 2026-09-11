CREATE TABLE IF NOT EXISTS "geo_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"query_key" text NOT NULL,
	"query" text NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"source" text DEFAULT 'owner' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_queries" ADD CONSTRAINT "geo_queries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_queries" ADD CONSTRAINT "geo_queries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "geo_queries_org_query_idx" ON "geo_queries" USING btree ("organization_id","query_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_queries_org_idx" ON "geo_queries" USING btree ("organization_id");
