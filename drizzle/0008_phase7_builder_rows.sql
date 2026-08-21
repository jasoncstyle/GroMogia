CREATE TABLE IF NOT EXISTS "builder_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"column_widths" jsonb DEFAULT '[100]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "builder_rows" ADD CONSTRAINT "builder_rows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_rows" ADD CONSTRAINT "builder_rows_site_id_builder_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."builder_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "builder_rows_org_idx" ON "builder_rows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "builder_rows_site_idx" ON "builder_rows" USING btree ("site_id");--> statement-breakpoint
ALTER TABLE "builder_sections" ADD COLUMN IF NOT EXISTS "row_id" uuid;--> statement-breakpoint
ALTER TABLE "builder_sections" ADD COLUMN IF NOT EXISTS "column_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "builder_sections" ADD CONSTRAINT "builder_sections_row_id_builder_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."builder_rows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "builder_sections_row_idx" ON "builder_sections" USING btree ("row_id");--> statement-breakpoint
DO $$
DECLARE
  section_row record;
  new_row_id uuid;
BEGIN
  FOR section_row IN
    SELECT "id", "organization_id", "site_id", "sort_order"
    FROM "builder_sections"
    WHERE "row_id" IS NULL
    ORDER BY "sort_order"
  LOOP
    INSERT INTO "builder_rows" ("organization_id", "site_id", "sort_order", "column_widths")
    VALUES (section_row."organization_id", section_row."site_id", section_row."sort_order", '[100]'::jsonb)
    RETURNING "id" INTO new_row_id;
    UPDATE "builder_sections"
    SET "row_id" = new_row_id, "column_index" = 0
    WHERE "id" = section_row."id";
  END LOOP;
END $$;
