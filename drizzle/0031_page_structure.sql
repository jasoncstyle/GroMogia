CREATE TABLE IF NOT EXISTS "internal_link_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"from_page_id" uuid NOT NULL,
	"from_url" text NOT NULL,
	"from_title" text DEFAULT '' NOT NULL,
	"to_page_id" uuid NOT NULL,
	"to_url" text NOT NULL,
	"to_title" text DEFAULT '' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'stored_pages' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_schema_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"page_url" text NOT NULL,
	"page_title" text DEFAULT '' NOT NULL,
	"schema_type" text NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'page_group' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "internal_link_suggestions" ADD CONSTRAINT "internal_link_suggestions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_link_suggestions" ADD CONSTRAINT "internal_link_suggestions_from_page_id_website_discovered_pages_id_fk" FOREIGN KEY ("from_page_id") REFERENCES "public"."website_discovered_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_link_suggestions" ADD CONSTRAINT "internal_link_suggestions_to_page_id_website_discovered_pages_id_fk" FOREIGN KEY ("to_page_id") REFERENCES "public"."website_discovered_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_schema_facts" ADD CONSTRAINT "page_schema_facts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_schema_facts" ADD CONSTRAINT "page_schema_facts_page_id_website_discovered_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."website_discovered_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "internal_link_suggestions_org_pages_idx" ON "internal_link_suggestions" USING btree ("organization_id","from_page_id","to_page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_link_suggestions_org_idx" ON "internal_link_suggestions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "page_schema_facts_org_page_idx" ON "page_schema_facts" USING btree ("organization_id","page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_schema_facts_org_idx" ON "page_schema_facts" USING btree ("organization_id");
