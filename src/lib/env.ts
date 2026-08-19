import { CURRENT_VERCEL_URL } from "@/lib/brand";

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function missingFoundationServices(): string[] {
  const missing: string[] = [];
  if (!isClerkConfigured()) missing.push("Clerk (sign-in)");
  if (!isDatabaseConfigured()) missing.push("Neon Postgres (database)");
  return missing;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? CURRENT_VERCEL_URL;
}
