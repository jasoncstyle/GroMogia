CREATE TABLE IF NOT EXISTS "before_after_looks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"before_value" integer NOT NULL,
	"after_value" integer NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"before_on" text DEFAULT '' NOT NULL,
	"after_on" text DEFAULT '' NOT NULL,
	"before_snapshot_id" uuid,
	"after_snapshot_id" uuid,
	"status" text DEFAULT 'same' NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'stored_goal' NOT NULL,
	"compared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "before_after_looks" ADD CONSTRAINT "before_after_looks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_looks" ADD CONSTRAINT "before_after_looks_goal_id_growth_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."growth_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_looks" ADD CONSTRAINT "before_after_looks_before_snapshot_id_goal_progress_snapshots_id_fk" FOREIGN KEY ("before_snapshot_id") REFERENCES "public"."goal_progress_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_looks" ADD CONSTRAINT "before_after_looks_after_snapshot_id_goal_progress_snapshots_id_fk" FOREIGN KEY ("after_snapshot_id") REFERENCES "public"."goal_progress_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "before_after_looks_org_goal_idx" ON "before_after_looks" USING btree ("organization_id","goal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "before_after_looks_org_idx" ON "before_after_looks" USING btree ("organization_id");
