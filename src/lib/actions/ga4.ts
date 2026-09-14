"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
import { getDb } from "@/lib/db";
import { ga4Snapshots, integrationConnections, websites } from "@/lib/db/schema";
import { GA4_PROVIDER_KEY, matchGa4Property, type Ga4PropertyChoice } from "@/lib/ga4/analytics";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession, type OrgSession } from "@/lib/require-org";
import {
  fetchGa4Snapshot,
  googleAnalyticsOAuthConfig,
  listGa4Properties,
} from "@/modules/integrations/google-analytics";
import { refreshGoogleAccessToken, revokeGoogleToken } from "@/modules/integrations/google-search-console";

export type StoredGa4Secret = {
  refreshToken: string
  propertyId?: string
  propertyName?: string
  candidates?: Ga4PropertyChoice[]
};

function revalidateGa4() {
  revalidatePath("/app/analytics");
  revalidatePath("/app/seo");
  revalidatePath("/app/integrations");
  revalidatePath("/app");
}

function canManageGa4(session: OrgSession): boolean {
  return (
    hasPermission(session.permissions, "manage_integrations") ||
    hasPermission(session.permissions, "manage_seo")
  );
}

export async function syncGa4(_formData?: FormData): Promise<ActionResult> {
  return runAction("Could not refresh Google Analytics.", async () => {
    const session = await requireOrgSession();
    if (!canManageGa4(session)) {
      throw new Error("You do not have permission to refresh Google Analytics.");
    }
    try {
      const snapshot = await refreshGa4ForOrganization({
        organizationId: session.organizationId,
        userId: session.userId,
      });
      return snapshot
        ? "Analytics numbers saved. GroovGro did not change the website."
        : "Pick the GA4 property that matches this business, then refresh.";
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Could not refresh Google Analytics.";
      await upsertGa4Connection(session.organizationId, {
        lastError: message.slice(0, 400),
      }).catch(() => undefined);
      throw error;
    }
  });
}

export async function selectGa4Property(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that Analytics property.", async () => {
    const session = await requireOrgSession();
    if (!canManageGa4(session)) {
      throw new Error("You do not have permission to connect Google Analytics.");
    }
    const propertyId = String(formData.get("propertyId") ?? "").trim();
    if (!propertyId) throw new Error("Choose a GA4 property.");
    const current = await readGa4Secret(session.organizationId);
    if (!current) throw new Error("Connect Google Analytics first.");
    const chosen = (current.candidates ?? []).find((row) => row.propertyId === propertyId);
    await writeGa4Secret(session.organizationId, {
      ...current,
      propertyId,
      propertyName: chosen?.displayName ?? current.propertyName ?? propertyId,
    });
    await refreshGa4ForOrganization({
      organizationId: session.organizationId,
      userId: session.userId,
    });
    return "Analytics property saved. GroovGro did not change the website.";
  });
}

export async function disconnectGa4(): Promise<ActionResult> {
  return runAction("Could not disconnect Google Analytics.", async () => {
    const session = await requireOrgSession();
    if (!canManageGa4(session)) {
      throw new Error("You do not have permission to disconnect Google Analytics.");
    }
    const current = await readGa4Secret(session.organizationId);
    if (current?.refreshToken) {
      await revokeGoogleToken(current.refreshToken);
    }
    await upsertGa4Connection(session.organizationId, {
      status: "disconnected",
      secretRef: null,
      scopes: [],
      lastError: null,
      lastSyncAt: null,
      expiresAt: null,
    });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "integration.disconnected",
      targetType: "integration",
      targetId: GA4_PROVIDER_KEY,
    });
    revalidateGa4();
    return "Google Analytics disconnected.";
  });
}

export async function completeGa4OAuth(input: {
  organizationId: string
  userId: string
  refreshToken: string
  accessToken: string
}): Promise<string> {
  if (!googleAnalyticsOAuthConfig()) {
    throw new Error("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then redeploy.");
  }
  const properties = await listGa4Properties(input.accessToken);
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.organizationId, input.organizationId))
    .limit(1);
  const match = website?.publicUrl
    ? matchGa4Property(website.publicUrl, properties)
    : { matched: properties.length === 1 ? properties[0] ?? null : null, candidates: properties };

  await writeGa4Secret(input.organizationId, {
    refreshToken: input.refreshToken,
    propertyId: match.matched?.propertyId,
    propertyName: match.matched?.displayName,
    candidates: match.candidates,
  });
  await upsertGa4Connection(input.organizationId, {
    status: "connected",
    scopes: ["analytics.readonly"],
    lastError: null,
    lastSyncAt: null,
  });
  await recordAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "integration.connected",
    targetType: "integration",
    targetId: GA4_PROVIDER_KEY,
  });
  if (match.matched) {
    await refreshGa4ForOrganization({
      organizationId: input.organizationId,
      userId: input.userId,
    });
    return "/app/analytics?ga4=connected";
  }
  if (match.candidates.length > 0) {
    return "/app/analytics?ga4=pick";
  }
  return "/app/analytics?ga4=missing";
}

export async function refreshGa4ForOrganization(input: {
  organizationId: string
  userId?: string | null
}) {
  const config = googleAnalyticsOAuthConfig();
  if (!config) {
    throw new Error("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then redeploy.");
  }
  const secret = await readGa4Secret(input.organizationId);
  if (!secret?.refreshToken) {
    throw new Error("Connect Google Analytics first.");
  }
  const accessToken = await refreshGoogleAccessToken(secret.refreshToken, config);
  const properties = await listGa4Properties(accessToken);
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.organizationId, input.organizationId))
    .limit(1);

  let propertyId = secret.propertyId;
  let propertyName = secret.propertyName;
  let candidates = properties;
  if (!propertyId) {
    const match = website?.publicUrl
      ? matchGa4Property(website.publicUrl, properties)
      : { matched: properties.length === 1 ? properties[0] ?? null : null, candidates: properties };
    propertyId = match.matched?.propertyId;
    propertyName = match.matched?.displayName;
    candidates = match.candidates;
    await writeGa4Secret(input.organizationId, {
      ...secret,
      propertyId,
      propertyName,
      candidates,
    });
    if (!propertyId) {
      revalidateGa4();
      return null;
    }
  }

  const chosen =
    properties.find((row) => row.propertyId === propertyId) ??
    ({
      propertyId,
      displayName: propertyName || propertyId,
      accountName: "GA4",
    } satisfies Ga4PropertyChoice);
  const snapshot = await fetchGa4Snapshot(accessToken, chosen);
  await db.insert(ga4Snapshots).values({
    organizationId: input.organizationId,
    propertyId: snapshot.propertyId,
    propertyName: snapshot.propertyName,
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
    totals: snapshot.totals,
    topPages: snapshot.topPages,
    topSources: snapshot.topSources,
    createdBy: input.userId ?? null,
  });
  await upsertGa4Connection(input.organizationId, {
    status: "connected",
    lastError: null,
    lastSyncAt: new Date(),
  });
  await recordAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId ?? null,
    action: "analytics.ga4_synced",
    targetType: "ga4_snapshot",
    metadata: {
      propertyId: snapshot.propertyId,
      sessions: snapshot.totals.sessions,
      via: input.userId ? "owner" : "schedule",
    },
  });
  revalidateGa4();
  return snapshot;
}

export async function readGa4Secret(
  organizationId: string,
): Promise<StoredGa4Secret | null> {
  const connection = await getGa4Connection(organizationId);
  if (!connection?.secretRef) return null;
  try {
    return JSON.parse(decryptSecret(connection.secretRef)) as StoredGa4Secret;
  } catch {
    return null;
  }
}

async function writeGa4Secret(organizationId: string, secret: StoredGa4Secret) {
  await upsertGa4Connection(organizationId, {
    status: "connected",
    secretRef: encryptSecret(JSON.stringify(secret)),
    scopes: ["analytics.readonly"],
  });
}

async function getGa4Connection(organizationId: string) {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.organizationId, organizationId),
        eq(integrationConnections.providerKey, GA4_PROVIDER_KEY),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function upsertGa4Connection(
  organizationId: string,
  values: {
    status?: "connected" | "disconnected" | "error"
    secretRef?: string | null
    scopes?: string[]
    lastError?: string | null
    lastSyncAt?: Date | null
    expiresAt?: Date | null
  },
) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const current = await getGa4Connection(organizationId);
  if (current) {
    await db
      .update(integrationConnections)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, current.id));
    return;
  }
  await db.insert(integrationConnections).values({
    organizationId,
    providerKey: GA4_PROVIDER_KEY,
    status: values.status ?? "disconnected",
    secretRef: values.secretRef,
    scopes: values.scopes ?? [],
    lastError: values.lastError ?? null,
    lastSyncAt: values.lastSyncAt ?? null,
    expiresAt: values.expiresAt ?? null,
  });
}
