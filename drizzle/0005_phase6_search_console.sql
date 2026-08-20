CREATE TABLE "search_console_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_url" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"totals" jsonb DEFAULT '{"clicks":0,"impressions":0,"ctr":0,"position":0}'::jsonb NOT NULL,
	"top_queries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"top_pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "search_console_snapshots" ADD CONSTRAINT "search_console_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_console_snapshots" ADD CONSTRAINT "search_console_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_console_snapshots_org_idx" ON "search_console_snapshots" USING btree ("organization_id");
