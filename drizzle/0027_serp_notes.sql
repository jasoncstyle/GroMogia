CREATE TABLE IF NOT EXISTS "serp_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"query_key" text DEFAULT '' NOT NULL,
	"query" text DEFAULT '' NOT NULL,
	"competitor_name" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'owner' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "serp_notes" ADD CONSTRAINT "serp_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serp_notes" ADD CONSTRAINT "serp_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serp_notes_org_idx" ON "serp_notes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serp_notes_org_query_idx" ON "serp_notes" USING btree ("organization_id","query_key");
