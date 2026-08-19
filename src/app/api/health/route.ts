import {
  isClerkConfigured,
  isDatabaseConfigured,
  isStripeConfigured,
} from "@/lib/env";

export function GET() {
  return Response.json({
    ok: true,
    service: "groovgro",
    phase: 2,
    clerk: isClerkConfigured(),
    database: isDatabaseConfigured(),
    stripe: isStripeConfigured(),
  });
}
