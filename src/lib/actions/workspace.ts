"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { getAppSession } from "@/lib/auth/session";
import {
  WORKSPACE_COOKIE,
  cleanBusinessName,
  cleanWorkspaceId,
  nextAvailableSlug,
  safeAppPath,
} from "@/lib/auth/workspace";
import { getDb } from "@/lib/db";
import { provisionOrganization } from "@/lib/db/bootstrap";
import { memberships, organizations, websites } from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { isSafePublicHttpUrl } from "@/lib/seo/audit";

async function rememberWorkspace(organizationId: string): Promise<void> {
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function switchWorkspace(formData: FormData): Promise<void> {
  const organizationId = cleanWorkspaceId(formData.get("organizationId"));
  const next = safeAppPath(formData.get("next"));
  const session = await getAppSession();
  if (!session.userId) {
    throw new Error("Sign in before switching businesses.");
  }
  const allowed = session.workspaces.some(
    (workspace) => workspace.id === organizationId,
  );
  if (!organizationId || !allowed) {
    throw new Error("You do not belong to that business.");
  }

  await rememberWorkspace(organizationId);
  await recordAudit({
    organizationId,
    actorUserId: session.userId,
    action: "workspace.switched",
    targetType: "organization",
    targetId: organizationId,
  });

  revalidatePath("/app", "layout");
  redirect(next);
}

export async function createWorkspace(formData: FormData): Promise<void> {
  const session = await getAppSession();
  if (!session.userId) {
    throw new Error("Sign in before adding a business.");
  }
  if (!hasPermission(session.permissions, "manage_settings")) {
    throw new Error("You do not have permission to add a business.");
  }

  const name = cleanBusinessName(formData.get("name"));
  if (name.length < 2) {
    throw new Error("Type the business name.");
  }

  let publicUrl = String(formData.get("publicUrl") ?? "").trim();
  if (publicUrl && !/^https?:\/\//i.test(publicUrl)) {
    publicUrl = `https://${publicUrl}`;
  }
  if (publicUrl && !isSafePublicHttpUrl(publicUrl)) {
    throw new Error("Use a public https website address, or leave it blank.");
  }

  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const existing = await db.select({ slug: organizations.slug }).from(organizations);
  const slug = nextAvailableSlug(
    name,
    existing.map((row) => row.slug),
  );

  await db.insert(organizations).values({ slug, name });
  const created = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  const organization = created[0];
  if (!organization) {
    throw new Error("Could not create the business.");
  }

  await db.insert(memberships).values({
    organizationId: organization.id,
    userId: session.userId,
    status: "active",
  });
  await provisionOrganization(organization.id, organization.name);

  if (publicUrl) {
    await db.insert(websites).values({
      organizationId: organization.id,
      kind: "connected",
      publicUrl,
      provider: "other",
      trackingId: crypto.randomUUID(),
      status: "active",
    });
  }

  await rememberWorkspace(organization.id);
  await recordAudit({
    organizationId: organization.id,
    actorUserId: session.userId,
    action: "workspace.created",
    targetType: "organization",
    targetId: organization.id,
    metadata: { name, slug, hasWebsite: Boolean(publicUrl) },
  });

  revalidatePath("/app", "layout");
  redirect(publicUrl ? "/app/analytics" : "/app/website");
}
