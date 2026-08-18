import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  bookings,
  events,
  integrationConnections,
  organizations,
  payments,
} from "@/lib/db/schema";
import { assertSameOrganization } from "@/lib/db/tenant";
import { findOrCreateContact } from "@/modules/contacts/store";
import { addCustomerLtv, ensureCustomer, markOpenLeadsWon } from "@/modules/crm/store";
import {
  normalizeStripeObject,
  type NormalizedStripePayment,
  type StripeLikeObject,
} from "@/modules/integrations/stripe-normalize";

export async function resolveStripeOrganizationId(
  metadata: Record<string, string>,
): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  if (metadata.organization_id) {
    const org = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, metadata.organization_id))
      .limit(1);
    return org[0]?.id ?? null;
  }

  const connected = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.providerKey, "stripe"),
        eq(integrationConnections.status, "connected"),
      ),
    );

  if (connected.length === 1) return connected[0].organizationId;

  const orgs = await db.select({ id: organizations.id }).from(organizations).limit(2);
  if (orgs.length === 1) return orgs[0].id;

  return null;
}

export async function ingestNormalizedPayment(
  organizationId: string,
  payment: NormalizedStripePayment,
): Promise<{ created: boolean }> {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const existingPayment = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.provider, "stripe"),
        eq(payments.providerObjectId, payment.providerObjectId),
      ),
    )
    .limit(1);
  if (existingPayment[0]) {
    assertSameOrganization(existingPayment[0].organizationId, organizationId);
    return { created: false };
  }

  let contactId: string | null = null;
  if (payment.email) {
    contactId = await findOrCreateContact(organizationId, {
      email: payment.email,
      displayName: payment.displayName,
    });
    await ensureCustomer(
      organizationId,
      contactId,
      payment.metadata.utm_source ?? payment.metadata.source ?? "stripe",
    );
    if (payment.kind === "charge") {
      await addCustomerLtv(contactId, payment.amountCents);
      await markOpenLeadsWon(organizationId, contactId);
    }
  }

  let eventId: string | null = payment.metadata.event_id || null;
  if (eventId) {
    const eventRows = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!eventRows[0] || eventRows[0].organizationId !== organizationId) {
      eventId = null;
    }
  }

  const existingBooking = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.externalProvider, "stripe"),
        eq(bookings.externalId, payment.bookingExternalId),
      ),
    )
    .limit(1);

  let bookingId = existingBooking[0]?.id ?? null;
  if (existingBooking[0]) {
    assertSameOrganization(existingBooking[0].organizationId, organizationId);
  }
  if (!bookingId) {
    bookingId = crypto.randomUUID();
    await db.insert(bookings).values({
      id: bookingId,
      organizationId,
      contactId,
      eventId,
      externalProvider: "stripe",
      externalId: payment.bookingExternalId,
      status: payment.kind === "refund" ? "refunded" : "confirmed",
      source: "stripe",
      campaignId:
        payment.metadata.campaign_id ?? payment.metadata.utm_campaign ?? null,
    });
  }

  await db.insert(payments).values({
    organizationId,
    bookingId,
    contactId,
    provider: "stripe",
    providerObjectId: payment.providerObjectId,
    amountCents: payment.amountCents,
    currency: payment.currency,
    kind: payment.kind,
    status: payment.status,
  });

  return { created: true };
}

export async function ingestStripeEvent(
  organizationId: string,
  eventType: string,
  object: StripeLikeObject,
) {
  const normalized = normalizeStripeObject(eventType, object);
  if (!normalized) return { created: false, ignored: true };
  return ingestNormalizedPayment(organizationId, normalized);
}
