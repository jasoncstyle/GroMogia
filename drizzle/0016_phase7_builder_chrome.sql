CREATE TABLE IF NOT EXISTS "builder_chrome" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"show_header" boolean DEFAULT true NOT NULL,
	"show_footer" boolean DEFAULT true NOT NULL,
	"show_page_links" boolean DEFAULT true NOT NULL,
	"header_name" text DEFAULT '' NOT NULL,
	"logo_url" text DEFAULT '' NOT NULL,
	"footer_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "builder_chrome" ADD CONSTRAINT "builder_chrome_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
