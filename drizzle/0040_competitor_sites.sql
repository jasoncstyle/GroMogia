CREATE TABLE IF NOT EXISTS "competitor_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"host" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"headings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nav_labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_guess" text DEFAULT '' NOT NULL,
	"marketing_guess" text DEFAULT '' NOT NULL,
	"compete_note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'saved' NOT NULL,
	"source" text DEFAULT 'owner' NOT NULL,
	"looked_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitor_sites" ADD CONSTRAINT "competitor_sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_sites" ADD CONSTRAINT "competitor_sites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "competitor_sites_org_host_idx" ON "competitor_sites" USING btree ("organization_id","host");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_sites_org_idx" ON "competitor_sites" USING btree ("organization_id");
