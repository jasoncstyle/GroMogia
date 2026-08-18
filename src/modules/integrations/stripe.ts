import { and, eq } from "drizzle-orm";
import Stripe from "stripe";

import { getDb } from "@/lib/db";
import { integrationConnections } from "@/lib/db/schema";
import { ingestStripeEvent } from "@/modules/integrations/stripe-ingest";
import type { StripeLikeObject } from "@/modules/integrations/stripe-normalize";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export async function syncStripeForOrganization(organizationId: string) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Add STRIPE_SECRET_KEY in Vercel before syncing payments.");
  }

  let imported = 0;
  const sessions = await stripe.checkout.sessions.list({ limit: 50 });
  for (const session of sessions.data) {
    const result = await ingestStripeEvent(
      organizationId,
      "checkout.session.completed",
      session as unknown as StripeLikeObject,
    );
    if (result.created) imported += 1;
  }

  const charges = await stripe.charges.list({ limit: 50 });
  for (const charge of charges.data) {
    const type = charge.refunded ? "charge.refunded" : "charge.succeeded";
    const result = await ingestStripeEvent(
      organizationId,
      type,
      charge as unknown as StripeLikeObject,
    );
    if (result.created) imported += 1;
  }

  const db = getDb();
  if (db) {
    await db
      .update(integrationConnections)
      .set({
        lastSyncAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationConnections.organizationId, organizationId),
          eq(integrationConnections.providerKey, "stripe"),
        ),
      );
  }

  return imported;
}
