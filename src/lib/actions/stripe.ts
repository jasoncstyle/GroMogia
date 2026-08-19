"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { integrationConnections } from "@/lib/db/schema";
import { isStripeConfigured } from "@/lib/env";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";
import { syncStripeForOrganization } from "@/modules/integrations/stripe";

async function upsertStripeConnection(
  organizationId: string,
  status: "connected" | "disconnected",
  lastError?: string | null,
) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const existing = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.organizationId, organizationId));
  const current = existing.find((row) => row.providerKey === "stripe");

  if (current) {
    await db
      .update(integrationConnections)
      .set({
        status,
        lastError: lastError ?? null,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, current.id));
    return;
  }

  await db.insert(integrationConnections).values({
    organizationId,
    providerKey: "stripe",
    status,
    lastError: lastError ?? null,
  });
}

export async function connectStripe(): Promise<ActionResult> {
  return runAction("Could not connect Stripe.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_integrations")) {
      throw new Error("You do not have permission to manage integrations.");
    }
    if (!isStripeConfigured()) {
      throw new Error(
        "Add STRIPE_SECRET_KEY in the Vercel project, then redeploy, before connecting Stripe.",
      );
    }

    await upsertStripeConnection(session.organizationId, "connected");
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "integration.connected",
      targetType: "integration",
      targetId: "stripe",
    });

    revalidatePath("/app/integrations");
    revalidatePath("/app/commerce");
    revalidatePath("/app");
    return "Stripe connected";
  });
}

export async function disconnectStripe(): Promise<ActionResult> {
  return runAction("Could not disconnect Stripe.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_integrations")) {
      throw new Error("You do not have permission to manage integrations.");
    }

    await upsertStripeConnection(session.organizationId, "disconnected");
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "integration.disconnected",
      targetType: "integration",
      targetId: "stripe",
    });

    revalidatePath("/app/integrations");
    revalidatePath("/app/commerce");
    return "Stripe disconnected";
  });
}

export async function syncStripePayments(): Promise<ActionResult> {
  return runAction("Could not sync Stripe.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_integrations")) {
      throw new Error("You do not have permission to manage integrations.");
    }

    try {
      const imported = await syncStripeForOrganization(session.organizationId);
      await recordAudit({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        action: "stripe.synced",
        targetType: "integration",
        targetId: "stripe",
        metadata: { imported },
      });
      revalidatePath("/app/commerce");
      revalidatePath("/app/crm");
      revalidatePath("/app/analytics");
      revalidatePath("/app");
      return imported
        ? `Imported ${imported} Stripe record${imported === 1 ? "" : "s"}`
        : "Stripe is up to date";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stripe sync failed";
      await upsertStripeConnection(session.organizationId, "connected", message);
      throw error;
    }
  });
}
