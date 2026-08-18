import { isClerkConfigured, isDatabaseConfigured } from "@/lib/env";

export function GET() {
  return Response.json({
    ok: true,
    service: "gromogia",
    clerk: isClerkConfigured(),
    database: isDatabaseConfigured(),
  });
}
