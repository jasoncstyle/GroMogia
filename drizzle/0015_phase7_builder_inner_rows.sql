ALTER TABLE "builder_rows" ADD COLUMN IF NOT EXISTS "parent_row_id" uuid;--> statement-breakpoint
ALTER TABLE "builder_rows" ADD COLUMN IF NOT EXISTS "parent_column_index" integer;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "builder_rows" ADD CONSTRAINT "builder_rows_parent_row_id_builder_rows_id_fk" FOREIGN KEY ("parent_row_id") REFERENCES "public"."builder_rows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "builder_rows_parent_idx" ON "builder_rows" USING btree ("parent_row_id");
