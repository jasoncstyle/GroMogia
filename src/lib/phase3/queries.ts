import { and, asc, eq, sql } from "drizzle-orm";

import { mergeAttributionRows, normalizeAttributionSource } from "@/lib/attribution";
import { getDb } from "@/lib/db";
import {
  attributionTouches,
  customers,
  leadRecords,
  payments,
} from "@/lib/db/schema";

export async function getMarketingSnapshot(organizationId: string) {
  const db = getDb();
  if (!db) {
    return {
      rows: [] as ReturnType<typeof mergeAttributionRows>,
      unattributedRevenueCents: 0,
    };
  }

  const visitRows = await db
    .select({
      source: attributionTouches.channel,
      count: sql<number>`count(*)::int`,
    })
    .from(attributionTouches)
    .where(eq(attributionTouches.organizationId, organizationId))
    .groupBy(attributionTouches.channel);

  const leadRows = await db
    .select({
      source: leadRecords.source,
      count: sql<number>`count(*)::int`,
    })
    .from(leadRecords)
    .where(eq(leadRecords.organizationId, organizationId))
    .groupBy(leadRecords.source);

  const customerRows = await db
    .select({
      source: customers.marketingSource,
      count: sql<number>`count(*)::int`,
    })
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
    .groupBy(customers.marketingSource);

  const chargeRows = await db
    .select({
      contactId: payments.contactId,
      amountCents: payments.amountCents,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.kind, "charge"),
        sql`${payments.providerObjectId} like 'ch_%'`,
      ),
    );

  const firstLeadByContact = new Map<string, string>();
  const leadSources = await db
    .select({
      contactId: leadRecords.contactId,
      source: leadRecords.source,
    })
    .from(leadRecords)
    .where(eq(leadRecords.organizationId, organizationId))
    .orderBy(asc(leadRecords.createdAt));
  for (const lead of leadSources) {
    if (!firstLeadByContact.has(lead.contactId)) {
      firstLeadByContact.set(lead.contactId, lead.source);
    }
  }

  const customerSourceByContact = new Map<string, string | null>();
  const customerSourceRows = await db
    .select({
      contactId: customers.contactId,
      source: customers.marketingSource,
    })
    .from(customers)
    .where(eq(customers.organizationId, organizationId));
  for (const customer of customerSourceRows) {
    customerSourceByContact.set(customer.contactId, customer.source);
  }

  const revenue: { source: string; cents: number }[] = [];
  let unattributedRevenueCents = 0;
  for (const charge of chargeRows) {
    const fromLead = charge.contactId
      ? firstLeadByContact.get(charge.contactId)
      : undefined;
    const fromCustomer = charge.contactId
      ? customerSourceByContact.get(charge.contactId)
      : undefined;
    const source = normalizeAttributionSource(
      fromLead || fromCustomer || (charge.contactId ? "stripe" : ""),
    );
    if (!charge.contactId) unattributedRevenueCents += charge.amountCents;
    revenue.push({ source, cents: charge.amountCents });
  }

  return {
    rows: mergeAttributionRows({
      visits: visitRows.map((row) => ({
        source: row.source,
        count: Number(row.count),
      })),
      leads: leadRows.map((row) => ({
        source: row.source,
        count: Number(row.count),
      })),
      customers: customerRows.map((row) => ({
        source: row.source ?? "",
        count: Number(row.count),
      })),
      revenue,
    }),
    unattributedRevenueCents,
  };
}
