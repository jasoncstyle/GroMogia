ALTER TABLE "business_brains" ADD COLUMN IF NOT EXISTS "ideal_customers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "business_brains" ADD COLUMN IF NOT EXISTS "pain_points" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "business_brains" ADD COLUMN IF NOT EXISTS "competitors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "business_brains" ADD COLUMN IF NOT EXISTS "differentiators" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "business_brains" ADD COLUMN IF NOT EXISTS "prohibited_claims" jsonb DEFAULT '[]'::jsonb NOT NULL;
