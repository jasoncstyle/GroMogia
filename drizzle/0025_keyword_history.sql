CREATE TABLE IF NOT EXISTS "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"query_key" text NOT NULL,
	"query" text NOT NULL,
	"source" text DEFAULT 'search_console' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "keyword_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	"snapshot_id" uuid,
	"property_url" text DEFAULT '' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" double precision DEFAULT 0 NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_history" ADD CONSTRAINT "keyword_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_history" ADD CONSTRAINT "keyword_history_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_history" ADD CONSTRAINT "keyword_history_snapshot_id_search_console_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."search_console_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "keywords_org_query_idx" ON "keywords" USING btree ("organization_id","query_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "keywords_org_idx" ON "keywords" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "keyword_history_keyword_snapshot_idx" ON "keyword_history" USING btree ("keyword_id","snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "keyword_history_org_idx" ON "keyword_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "keyword_history_keyword_idx" ON "keyword_history" USING btree ("keyword_id");
