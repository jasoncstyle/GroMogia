CREATE TABLE IF NOT EXISTS "channel_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"label" text DEFAULT 'none' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'stored_workspace' NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_scores" ADD CONSTRAINT "channel_scores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "channel_scores_org_channel_idx" ON "channel_scores" USING btree ("organization_id","channel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel_scores_org_idx" ON "channel_scores" USING btree ("organization_id");
