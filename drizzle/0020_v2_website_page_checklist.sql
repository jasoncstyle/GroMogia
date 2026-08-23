CREATE TABLE "website_discovered_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"url" text NOT NULL,
	"url_key" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"page_group" text DEFAULT 'other' NOT NULL,
	"important" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'crawl' NOT NULL,
	"is_home" boolean DEFAULT false NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"headings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_discovered_pages" ADD CONSTRAINT "website_discovered_pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_discovered_pages" ADD CONSTRAINT "website_discovered_pages_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "website_discovered_pages_org_url_idx" ON "website_discovered_pages" USING btree ("organization_id","url_key");--> statement-breakpoint
CREATE INDEX "website_discovered_pages_org_idx" ON "website_discovered_pages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "website_discovered_pages_website_idx" ON "website_discovered_pages" USING btree ("website_id");
