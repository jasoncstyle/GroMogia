CREATE TABLE IF NOT EXISTS "content_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"query_key" text DEFAULT '' NOT NULL,
	"query" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"audience" text DEFAULT '' NOT NULL,
	"outline" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"source" text DEFAULT 'owner' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_briefs_org_idx" ON "content_briefs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_briefs_org_query_idx" ON "content_briefs" USING btree ("organization_id","query_key");
