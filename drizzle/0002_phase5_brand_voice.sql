CREATE TABLE "brand_voice_examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"direction" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_voice_profiles" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"tone" text DEFAULT '' NOT NULL,
	"audience" text DEFAULT '' NOT NULL,
	"do_say" text DEFAULT '' NOT NULL,
	"dont_say" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_voice_examples" ADD CONSTRAINT "brand_voice_examples_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice_examples" ADD CONSTRAINT "brand_voice_examples_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice_profiles" ADD CONSTRAINT "brand_voice_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_voice_examples_org_idx" ON "brand_voice_examples" USING btree ("organization_id");