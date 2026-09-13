CREATE TABLE IF NOT EXISTS "bot_proposal_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"seat" text NOT NULL,
	"property" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"source_range" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_proposal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"pack_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"type" text NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"evidence" text NOT NULL,
	"draft" text DEFAULT '' NOT NULL,
	"expected_effect" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"shipped_at" timestamp with time zone,
	"created_by" uuid,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_proposal_packs" ADD CONSTRAINT "bot_proposal_packs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_proposal_packs" ADD CONSTRAINT "bot_proposal_packs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_proposal_items" ADD CONSTRAINT "bot_proposal_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_proposal_items" ADD CONSTRAINT "bot_proposal_items_pack_id_bot_proposal_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."bot_proposal_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_proposal_items" ADD CONSTRAINT "bot_proposal_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_proposal_items" ADD CONSTRAINT "bot_proposal_items_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_proposal_packs_org_idx" ON "bot_proposal_packs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_proposal_packs_org_seat_idx" ON "bot_proposal_packs" USING btree ("organization_id","seat");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_proposal_items_org_idx" ON "bot_proposal_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_proposal_items_pack_idx" ON "bot_proposal_items" USING btree ("pack_id");
