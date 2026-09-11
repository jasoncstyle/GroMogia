CREATE TABLE IF NOT EXISTS "execution_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"title" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'review' NOT NULL,
	"source" text DEFAULT 'owner' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "execution_requests" ADD CONSTRAINT "execution_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_requests" ADD CONSTRAINT "execution_requests_action_id_growth_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."growth_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_requests" ADD CONSTRAINT "execution_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "execution_requests_org_action_idx" ON "execution_requests" USING btree ("organization_id","action_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execution_requests_org_idx" ON "execution_requests" USING btree ("organization_id");
