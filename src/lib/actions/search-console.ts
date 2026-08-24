"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
import { getDb } from "@/lib/db";
import {
  integrationConnections,
  searchConsoleSnapshots,
  websites,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession, type OrgSession } from "@/lib/require-org";
import { matchSearchConsoleProperty } from "@/lib/seo/search-console";
import {
  fetchSearchConsoleSnapshot,
  googleOAuthConfig,
  listSearchConsoleSites,
  refreshGoogleAccessToken,
  revokeGoogleToken,
} from "@/modules/integrations/google-search-console";

export type StoredGoogleSecret = {
  refreshToken: string
  siteUrl?: string
  candidates?: string[]
};

function revalidateSearchConsole() {
  revalidatePath("/app/seo");
  revalidatePath("/app/integrations");
  revalidatePath("/app/next-step");
  revalidatePath("/app");
}

function canManageSearchConsole(session: OrgSession): boolean {
  return (
    hasPermission(session.permissions, "manage_seo") ||
    hasPermission(session.permissions, "manage_integrations")
  );
}

export async function syncSearchConsole(): Promise<ActionResult> {
  return runAction("Could not refresh Search Console.", async () => {
    const session = await requireOrgSession();
    if (!canManageSearchConsole(session)) {
      throw new Error("You do not have permission to refresh Search Console.");
    }
    const snapshot = await refreshSearchConsoleForOrganization(session);
    return snapshot
      ? "Search Console numbers saved. GroovGro did not change the website."
      : "Pick the Search Console property that matches the connected website, then refresh.";
  });
}

export async function selectSearchConsoleProperty(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not save that Search Console property.", async () => {
    const session = await requireOrgSession();
    if (!canManageSearchConsole(session)) {
      throw new Error("You do not have permission to connect Search Console.");
    }
    const siteUrl = String(formData.get("siteUrl") ?? "").trim();
    if (!siteUrl) throw new Error("Choose a Search Console property.");

    const current = await readGoogleSecret(session.organizationId);
    if (!current) {
      throw new Error("Connect Search Console first.");
    }
    await writeGoogleSecret(session.organizationId, {
      ...current,
      siteUrl,
    });
    await refreshSearchConsoleForOrganization(session);
    return "Search Console property saved. GroovGro did not change the website.";
  });
}

export async function disconnectSearchConsole(): Promise<ActionResult> {
  return runAction("Could not disconnect Search Console.", async () => {
    const session = await requireOrgSession();
    if (!canManageSearchConsole(session)) {
      throw new Error("You do not have permission to disconnect Search Console.");
    }
    const current = await readGoogleSecret(session.organizationId);
    if (current?.refreshToken) {
      await revokeGoogleToken(current.refreshToken);
    }
    await upsertGoogleConnection(session.organizationId, {
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
      targetId: "google",
    });
    revalidateSearchConsole();
    return "Search Console disconnected.";
  });
}

export async function completeGoogleOAuth(input: {
  organizationId: string
  userId: string
  refreshToken: string
  accessToken: string
}): Promise<string> {
  if (!googleOAuthConfig()) {
    throw new Error("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then redeploy.");
  }

  const properties = await listSearchConsoleSites(input.accessToken);
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.organizationId, input.organizationId))
    .limit(1);

  const match = website?.publicUrl
    ? matchSearchConsoleProperty(website.publicUrl, properties)
    : { matched: null, candidates: properties };

  await writeGoogleSecret(input.organizationId, {
    refreshToken: input.refreshToken,
    siteUrl: match.matched ?? undefined,
    candidates: match.candidates,
  });
  await upsertGoogleConnection(input.organizationId, {
    status: "connected",
    scopes: ["search_console.readonly"],
    lastError: null,
    lastSyncAt: null,
  });
  await recordAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "integration.connected",
    targetType: "integration",
    targetId: "google",
  });

  if (match.matched) {
    await refreshSearchConsoleForOrganization({
      organizationId: input.organizationId,
      userId: input.userId,
    } as OrgSession);
    return "/app/seo?gsc=connected";
  }
  if (match.candidates.length > 0) {
    return "/app/seo?gsc=pick";
  }
  return "/app/seo?gsc=missing";
}

async function refreshSearchConsoleForOrganization(
  session: Pick<OrgSession, "organizationId" | "userId">,
) {
  const config = googleOAuthConfig();
  if (!config) {
    throw new Error("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then redeploy.");
  }
  const secret = await readGoogleSecret(session.organizationId);
  if (!secret?.refreshToken) {
    throw new Error("Connect Search Console first.");
  }
  const accessToken = await refreshGoogleAccessToken(secret.refreshToken, config);
  const properties = await listSearchConsoleSites(accessToken);
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.organizationId, session.organizationId))
    .limit(1);

  let siteUrl = secret.siteUrl;
  if (!siteUrl) {
    const match = website?.publicUrl
      ? matchSearchConsoleProperty(website.publicUrl, properties)
      : { matched: null, candidates: properties };
    siteUrl = match.matched ?? undefined;
    await writeGoogleSecret(session.organizationId, {
      ...secret,
      siteUrl,
      candidates: match.candidates,
    });
    if (!siteUrl) {
      revalidateSearchConsole();
      return null;
    }
  }

  const snapshot = await fetchSearchConsoleSnapshot(accessToken, siteUrl);
  await db.insert(searchConsoleSnapshots).values({
    organizationId: session.organizationId,
    propertyUrl: snapshot.propertyUrl,
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
    totals: snapshot.totals,
    topQueries: snapshot.topQueries,
    topPages: snapshot.topPages,
    createdBy: session.userId,
  });
  await upsertGoogleConnection(session.organizationId, {
    status: "connected",
    lastError: null,
    lastSyncAt: new Date(),
  });
  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "seo.search_console_synced",
    targetType: "search_console_snapshot",
    metadata: {
      propertyUrl: snapshot.propertyUrl,
      clicks: snapshot.totals.clicks,
    },
  });
  revalidateSearchConsole();
  return snapshot;
}

export async function readGoogleSecret(
  organizationId: string,
): Promise<StoredGoogleSecret | null> {
  const connection = await getGoogleConnection(organizationId);
  if (!connection?.secretRef) return null;
  try {
    return JSON.parse(decryptSecret(connection.secretRef)) as StoredGoogleSecret;
  } catch {
    return null;
  }
}

async function writeGoogleSecret(
  organizationId: string,
  secret: StoredGoogleSecret,
) {
  await upsertGoogleConnection(organizationId, {
    status: "connected",
    secretRef: encryptSecret(JSON.stringify(secret)),
    scopes: ["search_console.readonly"],
  });
}

async function getGoogleConnection(organizationId: string) {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.organizationId, organizationId),
        eq(integrationConnections.providerKey, "google"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function upsertGoogleConnection(
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
  const current = await getGoogleConnection(organizationId);
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
    providerKey: "google",
    status: values.status ?? "disconnected",
    secretRef: values.secretRef,
    scopes: values.scopes ?? [],
    lastError: values.lastError ?? null,
    lastSyncAt: values.lastSyncAt ?? null,
    expiresAt: values.expiresAt ?? null,
  });
}
