import { and, desc, eq } from "drizzle-orm";

import { readGa4Secret } from "@/lib/actions/ga4";
import { getDb } from "@/lib/db";
import { ga4Snapshots, integrationConnections } from "@/lib/db/schema";
import { isGoogleOAuthConfigured } from "@/lib/env";
import { GA4_PROVIDER_KEY, type Ga4PropertyChoice } from "@/lib/ga4/analytics";

export async function getGa4PageData(organizationId: string) {
  const empty = {
    configured: isGoogleOAuthConfigured(),
    connected: false,
    propertyId: null as string | null,
    propertyName: null as string | null,
    candidates: [] as Ga4PropertyChoice[],
    lastSyncAt: null as Date | null,
    lastError: null as string | null,
    snapshots: [] as (typeof ga4Snapshots.$inferSelect)[],
  };
  const db = getDb();
  if (!db || !organizationId) return empty;

  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.organizationId, organizationId),
        eq(integrationConnections.providerKey, GA4_PROVIDER_KEY),
      ),
    )
    .limit(1);
  const secret =
    connection?.status === "connected" ? await readGa4Secret(organizationId) : null;
  const snapshots = await db
    .select()
    .from(ga4Snapshots)
    .where(eq(ga4Snapshots.organizationId, organizationId))
    .orderBy(desc(ga4Snapshots.createdAt))
    .limit(8);

  return {
    configured: isGoogleOAuthConfigured(),
    connected: connection?.status === "connected",
    propertyId: secret?.propertyId ?? null,
    propertyName: secret?.propertyName ?? null,
    candidates: secret?.candidates ?? [],
    lastSyncAt: connection?.lastSyncAt ?? null,
    lastError: connection?.lastError ?? null,
    snapshots,
  };
}

export function ga4Notice(code: string | undefined, error: string | undefined): string | null {
  if (error) return error;
  if (code === "connected") {
    return "Google Analytics connected. GroovGro only reads stored numbers.";
  }
  if (code === "pick") {
    return "Choose the GA4 property for this business, then refresh.";
  }
  if (code === "missing") {
    return "That Google account has no GA4 properties GroovGro can read. Add this site in Google Analytics, then connect again.";
  }
  return null;
}
