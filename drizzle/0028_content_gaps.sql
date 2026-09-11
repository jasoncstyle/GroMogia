CREATE TABLE IF NOT EXISTS "content_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"query_key" text NOT NULL,
	"query" text NOT NULL,
	"status" text DEFAULT 'gap' NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"matched_page_url" text DEFAULT '' NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'stored_pages' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_gaps" ADD CONSTRAINT "content_gaps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "content_gaps_org_query_idx" ON "content_gaps" USING btree ("organization_id","query_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_gaps_org_idx" ON "content_gaps" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_gaps_org_status_idx" ON "content_gaps" USING btree ("organization_id","status");
