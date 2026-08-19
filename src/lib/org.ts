import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";

export async function resolveOrganizationSlug(
  organizationId?: string,
  sessionSlug?: string,
): Promise<string | null> {
  if (sessionSlug) return sessionSlug;
  if (!organizationId) return null;
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return row?.slug ?? null;
}
