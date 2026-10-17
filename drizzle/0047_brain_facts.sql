CREATE TABLE "brain_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_class" text NOT NULL,
	"name" text NOT NULL,
	"domain" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"provider_key" text,
	"locator" text DEFAULT '' NOT NULL,
	"recorded_at" timestamp with time zone,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_intake_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_id" uuid,
	"converted_to_observation_id" uuid,
	"converted_to_fact_id" uuid,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"intake_item_id" uuid,
	"subject" text NOT NULL,
	"observed_claim" text NOT NULL,
	"locator" text DEFAULT '' NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"coverage_note" text DEFAULT '' NOT NULL,
	"related_fact_id" uuid,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"attribute" text NOT NULL,
	"value_text" text DEFAULT '' NOT NULL,
	"value_json" jsonb,
	"status" text NOT NULL,
	"risk" text NOT NULL,
	"freshness" text NOT NULL,
	"source_id" uuid,
	"source_class" text DEFAULT '' NOT NULL,
	"domain" text NOT NULL,
	"brand_scope" text DEFAULT '' NOT NULL,
	"location_scope" text DEFAULT '' NOT NULL,
	"offering_id" uuid,
	"person_label" text DEFAULT '' NOT NULL,
	"coverage_limitation" text DEFAULT '' NOT NULL,
	"superseded_by_fact_id" uuid,
	"supersedes_fact_id" uuid,
	"observed_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"intake_item_id" uuid,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_fact_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"fact_id" uuid NOT NULL,
	"previous_value_text" text DEFAULT '' NOT NULL,
	"previous_status" text DEFAULT '' NOT NULL,
	"previous_risk" text DEFAULT '' NOT NULL,
	"previous_source_id" uuid,
	"change_kind" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_contradictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" text NOT NULL,
	"summary" text NOT NULL,
	"domain" text DEFAULT '' NOT NULL,
	"resolution_note" text DEFAULT '' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_contradiction_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contradiction_id" uuid NOT NULL,
	"party_type" text NOT NULL,
	"party_id" uuid NOT NULL,
	"role" text DEFAULT 'conflicting' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"from_kind" text NOT NULL,
	"from_ref" text NOT NULL,
	"to_kind" text NOT NULL,
	"to_ref" text NOT NULL,
	"relation_type" text NOT NULL,
	"evidence_fact_id" uuid,
	"evidence_observation_id" uuid,
	"status" text DEFAULT 'recorded' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brain_sources" ADD CONSTRAINT "brain_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_intake_items" ADD CONSTRAINT "brain_intake_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_intake_items" ADD CONSTRAINT "brain_intake_items_source_id_brain_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."brain_sources"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_observations" ADD CONSTRAINT "brain_observations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_observations" ADD CONSTRAINT "brain_observations_source_id_brain_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."brain_sources"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_facts" ADD CONSTRAINT "brain_facts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_facts" ADD CONSTRAINT "brain_facts_source_id_brain_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."brain_sources"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_facts" ADD CONSTRAINT "brain_facts_offering_id_offers_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_fact_history" ADD CONSTRAINT "brain_fact_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_fact_history" ADD CONSTRAINT "brain_fact_history_fact_id_brain_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."brain_facts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_contradictions" ADD CONSTRAINT "brain_contradictions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_contradiction_members" ADD CONSTRAINT "brain_contradiction_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_contradiction_members" ADD CONSTRAINT "brain_contradiction_members_contradiction_id_brain_contradictions_id_fk" FOREIGN KEY ("contradiction_id") REFERENCES "public"."brain_contradictions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_relationships" ADD CONSTRAINT "brain_relationships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "brain_sources_org_idx" ON "brain_sources" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "brain_intake_items_org_idx" ON "brain_intake_items" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "brain_observations_org_idx" ON "brain_observations" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "brain_observations_source_idx" ON "brain_observations" USING btree ("source_id");
--> statement-breakpoint
CREATE INDEX "brain_facts_org_idx" ON "brain_facts" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "brain_facts_org_subject_idx" ON "brain_facts" USING btree ("organization_id","subject","attribute");
--> statement-breakpoint
CREATE INDEX "brain_facts_source_idx" ON "brain_facts" USING btree ("source_id");
--> statement-breakpoint
CREATE INDEX "brain_fact_history_org_idx" ON "brain_fact_history" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "brain_fact_history_fact_idx" ON "brain_fact_history" USING btree ("fact_id");
--> statement-breakpoint
CREATE INDEX "brain_contradictions_org_idx" ON "brain_contradictions" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "brain_contradiction_members_org_idx" ON "brain_contradiction_members" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "brain_contradiction_members_contradiction_idx" ON "brain_contradiction_members" USING btree ("contradiction_id");
--> statement-breakpoint
CREATE INDEX "brain_relationships_org_idx" ON "brain_relationships" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "offers_id_org_idx" ON "offers" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "brain_sources_id_org_idx" ON "brain_sources" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "brain_intake_items_id_org_idx" ON "brain_intake_items" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "brain_observations_id_org_idx" ON "brain_observations" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "brain_facts_id_org_idx" ON "brain_facts" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "brain_contradictions_id_org_idx" ON "brain_contradictions" USING btree ("id","organization_id");
--> statement-breakpoint
ALTER TABLE "brain_intake_items" ADD CONSTRAINT "brain_intake_items_source_org_fk" FOREIGN KEY ("source_id","organization_id") REFERENCES "public"."brain_sources"("id","organization_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_observations" ADD CONSTRAINT "brain_observations_source_org_fk" FOREIGN KEY ("source_id","organization_id") REFERENCES "public"."brain_sources"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_observations" ADD CONSTRAINT "brain_observations_intake_org_fk" FOREIGN KEY ("intake_item_id","organization_id") REFERENCES "public"."brain_intake_items"("id","organization_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_observations" ADD CONSTRAINT "brain_observations_related_fact_org_fk" FOREIGN KEY ("related_fact_id","organization_id") REFERENCES "public"."brain_facts"("id","organization_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_facts" ADD CONSTRAINT "brain_facts_source_org_fk" FOREIGN KEY ("source_id","organization_id") REFERENCES "public"."brain_sources"("id","organization_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_facts" ADD CONSTRAINT "brain_facts_offering_org_fk" FOREIGN KEY ("offering_id","organization_id") REFERENCES "public"."offers"("id","organization_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_facts" ADD CONSTRAINT "brain_facts_intake_org_fk" FOREIGN KEY ("intake_item_id","organization_id") REFERENCES "public"."brain_intake_items"("id","organization_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_facts" ADD CONSTRAINT "brain_facts_superseded_by_org_fk" FOREIGN KEY ("superseded_by_fact_id","organization_id") REFERENCES "public"."brain_facts"("id","organization_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_facts" ADD CONSTRAINT "brain_facts_supersedes_org_fk" FOREIGN KEY ("supersedes_fact_id","organization_id") REFERENCES "public"."brain_facts"("id","organization_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_fact_history" ADD CONSTRAINT "brain_fact_history_fact_org_fk" FOREIGN KEY ("fact_id","organization_id") REFERENCES "public"."brain_facts"("id","organization_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_contradiction_members" ADD CONSTRAINT "brain_contradiction_members_contradiction_org_fk" FOREIGN KEY ("contradiction_id","organization_id") REFERENCES "public"."brain_contradictions"("id","organization_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_relationships" ADD CONSTRAINT "brain_relationships_fact_org_fk" FOREIGN KEY ("evidence_fact_id","organization_id") REFERENCES "public"."brain_facts"("id","organization_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brain_relationships" ADD CONSTRAINT "brain_relationships_observation_org_fk" FOREIGN KEY ("evidence_observation_id","organization_id") REFERENCES "public"."brain_observations"("id","organization_id") ON DELETE set null ON UPDATE no action;
