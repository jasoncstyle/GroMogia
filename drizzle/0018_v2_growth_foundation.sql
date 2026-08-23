CREATE TABLE "business_brains" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"industry" text DEFAULT '' NOT NULL,
	"business_model" text DEFAULT '' NOT NULL,
	"locations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"service_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"operating_hours" text DEFAULT '' NOT NULL,
	"seasonality" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"discovery_status" text DEFAULT 'not_started' NOT NULL,
	"inferred_summary" text DEFAULT '' NOT NULL,
	"inferred_source" text DEFAULT '' NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"offer_type" text DEFAULT 'other' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"pricing_model" text DEFAULT 'unspecified' NOT NULL,
	"price_cents" integer,
	"cost_cents" integer,
	"estimated_margin_cents" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"availability_model" text DEFAULT 'unconstrained' NOT NULL,
	"active_from" timestamp with time zone,
	"active_to" timestamp with time zone,
	"location" text DEFAULT '' NOT NULL,
	"conversion_url" text DEFAULT '' NOT NULL,
	"external_provider" text DEFAULT '' NOT NULL,
	"external_id" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_constraints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"offer_id" uuid,
	"constraint_type" text NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"total_availability" integer,
	"remaining_availability" integer,
	"resource_name" text DEFAULT '' NOT NULL,
	"starts_on" timestamp with time zone,
	"ends_on" timestamp with time zone,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text DEFAULT '' NOT NULL,
	"refreshed_at" timestamp with time zone,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"goal_type" text DEFAULT 'custom' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"starts_on" timestamp with time zone,
	"deadline" timestamp with time zone,
	"target_metric" text DEFAULT '' NOT NULL,
	"target_value" integer,
	"baseline_value" integer,
	"current_value" integer DEFAULT 0 NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"offer_id" uuid,
	"customer_segment" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"expected_revenue_cents" integer,
	"expected_margin_cents" integer,
	"total_budget_cents" integer,
	"channel_limits" text DEFAULT '' NOT NULL,
	"applicable_constraints" text DEFAULT '' NOT NULL,
	"success_definition" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"strategy_summary" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"starts_on" timestamp with time zone,
	"ends_on" timestamp with time zone,
	"budget_cents" integer,
	"created_by" uuid,
	"created_by_ai" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"goal_id" uuid,
	"plan_id" uuid,
	"action_id" uuid,
	"decision_type" text NOT NULL,
	"recommendation" text NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"supporting_evidence" text DEFAULT '' NOT NULL,
	"evidence_window" text DEFAULT '' NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"alternatives" text DEFAULT '' NOT NULL,
	"user_response" text DEFAULT '' NOT NULL,
	"approval_status" text DEFAULT 'none' NOT NULL,
	"resulting_action" text DEFAULT '' NOT NULL,
	"outcome" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"goal_id" uuid,
	"plan_id" uuid,
	"module" text DEFAULT '' NOT NULL,
	"action_type" text DEFAULT '' NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"risk" text DEFAULT 'optimization' NOT NULL,
	"proposed_by" uuid,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"provider" text DEFAULT '' NOT NULL,
	"external_id" text DEFAULT '' NOT NULL,
	"result" text DEFAULT '' NOT NULL,
	"error" text DEFAULT '' NOT NULL,
	"rollback_available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"autonomy_level" integer DEFAULT 2 NOT NULL,
	"review_frequency" text DEFAULT 'weekly' NOT NULL,
	"review_day" text DEFAULT 'monday' NOT NULL,
	"review_time" text DEFAULT '10:00' NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"recommended_frequency" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"min_elapsed_days" integer DEFAULT 7 NOT NULL,
	"min_observations" integer DEFAULT 0 NOT NULL,
	"min_conversions" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_brains" ADD CONSTRAINT "business_brains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_constraints" ADD CONSTRAINT "availability_constraints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_constraints" ADD CONSTRAINT "availability_constraints_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_goals" ADD CONSTRAINT "growth_goals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_goals" ADD CONSTRAINT "growth_goals_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_goals" ADD CONSTRAINT "growth_goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_plans" ADD CONSTRAINT "growth_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_plans" ADD CONSTRAINT "growth_plans_goal_id_growth_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."growth_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_plans" ADD CONSTRAINT "growth_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_plans" ADD CONSTRAINT "growth_plans_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_goal_id_growth_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."growth_goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_plan_id_growth_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."growth_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_actions" ADD CONSTRAINT "growth_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_actions" ADD CONSTRAINT "growth_actions_goal_id_growth_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."growth_goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_actions" ADD CONSTRAINT "growth_actions_plan_id_growth_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."growth_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_actions" ADD CONSTRAINT "growth_actions_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_actions" ADD CONSTRAINT "growth_actions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_settings" ADD CONSTRAINT "growth_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_policies" ADD CONSTRAINT "evidence_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offers_org_idx" ON "offers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "availability_constraints_org_idx" ON "availability_constraints" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "availability_constraints_offer_idx" ON "availability_constraints" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "growth_goals_org_idx" ON "growth_goals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "growth_goals_offer_idx" ON "growth_goals" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "growth_plans_org_idx" ON "growth_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "growth_plans_goal_idx" ON "growth_plans" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "decision_records_org_idx" ON "decision_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "decision_records_goal_idx" ON "decision_records" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "growth_actions_org_idx" ON "growth_actions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "growth_actions_goal_idx" ON "growth_actions" USING btree ("goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_policies_org_channel_idx" ON "evidence_policies" USING btree ("organization_id","channel");--> statement-breakpoint
CREATE INDEX "evidence_policies_org_idx" ON "evidence_policies" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "lead_records" ADD COLUMN IF NOT EXISTS "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_records" ADD COLUMN IF NOT EXISTS "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_records" ADD COLUMN IF NOT EXISTS "offer_id" uuid;--> statement-breakpoint
ALTER TABLE "attribution_touches" ADD COLUMN IF NOT EXISTS "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "offer_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "offer_id" uuid;
