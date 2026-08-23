ALTER TABLE "growth_goals" ADD COLUMN IF NOT EXISTS "progress_recorded_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "goal_progress_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'connected' NOT NULL,
	"recorded_on" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goal_progress_snapshots" ADD CONSTRAINT "goal_progress_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress_snapshots" ADD CONSTRAINT "goal_progress_snapshots_goal_id_growth_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."growth_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "goal_progress_snapshots_goal_day_source_idx" ON "goal_progress_snapshots" USING btree ("goal_id","recorded_on","source");--> statement-breakpoint
CREATE INDEX "goal_progress_snapshots_org_idx" ON "goal_progress_snapshots" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "goal_progress_snapshots_goal_idx" ON "goal_progress_snapshots" USING btree ("goal_id");
