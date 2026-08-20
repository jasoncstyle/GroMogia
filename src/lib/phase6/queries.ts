import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { seoAudits, websites } from "@/lib/db/schema";

export async function getSeoPageData(organizationId: string) {
  const db = getDb();
  if (!db) {
    return { website: null, audits: [] as (typeof seoAudits.$inferSelect)[] };
  }

  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.organizationId, organizationId))
    .limit(1);

  const audits = await db
    .select()
    .from(seoAudits)
    .where(eq(seoAudits.organizationId, organizationId))
    .orderBy(desc(seoAudits.createdAt))
    .limit(5);

  return { website: website ?? null, audits };
}
