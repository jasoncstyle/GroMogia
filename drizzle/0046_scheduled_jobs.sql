CREATE TABLE "scheduled_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"task_key" text NOT NULL,
	"frequency" text DEFAULT 'off' NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"last_status" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_jobs_org_task_idx" ON "scheduled_jobs" USING btree ("organization_id","task_key");
--> statement-breakpoint
CREATE INDEX "scheduled_jobs_due_idx" ON "scheduled_jobs" USING btree ("next_run_at");
--> statement-breakpoint
CREATE INDEX "scheduled_jobs_org_idx" ON "scheduled_jobs" USING btree ("organization_id");
