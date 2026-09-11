import { and, asc, eq, sql } from "drizzle-orm";

import { mergeAttributionRows, normalizeAttributionSource } from "@/lib/attribution";
import {
  addAttributionLabelCount,
  attributionOriginKey,
  emptyAttributionLabelCounts,
  labelAttributionOrigin,
  labelStoredJoin,
  namedOriginCountForContact,
  recordNamedOrigin,
  type LabeledAttributionRow,
} from "@/lib/attribution-labels";
import { getDb } from "@/lib/db";
import {
  attributionTouches,
  customers,
  leadRecords,
  payments,
  websites,
} from "@/lib/db/schema";

export async function getMarketingSnapshot(organizationId: string) {
  const db = getDb();
  if (!db) {
    return {
      rows: [] as LabeledAttributionRow[],
      unattributedRevenueCents: 0,
      websiteUrl: "",
      labelCounts: emptyAttributionLabelCounts(),
    };
  }

  const [website] = await db
    .select({ publicUrl: websites.publicUrl })
    .from(websites)
    .where(eq(websites.organizationId, organizationId))
    .limit(1);

  const visitRows = await db
    .select({
      source: attributionTouches.channel,
      campaign: attributionTouches.campaignId,
      count: sql<number>`count(*)::int`,
    })
    .from(attributionTouches)
    .where(eq(attributionTouches.organizationId, organizationId))
    .groupBy(attributionTouches.channel, attributionTouches.campaignId);

  const leadRows = await db
    .select({
      source: leadRecords.source,
      campaign: leadRecords.campaignId,
      count: sql<number>`count(*)::int`,
    })
    .from(leadRecords)
    .where(eq(leadRecords.organizationId, organizationId))
    .groupBy(leadRecords.source, leadRecords.campaignId);

  const customerRows = await db
    .select({
      contactId: customers.contactId,
      source: customers.marketingSource,
    })
    .from(customers)
    .where(eq(customers.organizationId, organizationId));

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

  const firstLeadByContact = new Map<string, { source: string; campaign: string }>();
  const leadSources = await db
    .select({
      contactId: leadRecords.contactId,
      source: leadRecords.source,
      campaign: leadRecords.campaignId,
    })
    .from(leadRecords)
    .where(eq(leadRecords.organizationId, organizationId))
    .orderBy(asc(leadRecords.createdAt));
  for (const lead of leadSources) {
    if (!firstLeadByContact.has(lead.contactId)) {
      firstLeadByContact.set(lead.contactId, {
        source: lead.source,
        campaign: lead.campaign ?? "",
      });
    }
  }

  const customerSourceByContact = new Map<string, string | null>();
  const customersForMerge: { source: string; campaign: string; count: number }[] = [];
  for (const customer of customerRows) {
    customerSourceByContact.set(customer.contactId, customer.source);
    const fromLead = firstLeadByContact.get(customer.contactId);
    customersForMerge.push({
      source: customer.source ?? fromLead?.source ?? "",
      campaign: fromLead?.campaign ?? "",
      count: 1,
    });
  }

  const revenue: { source: string; campaign: string; cents: number }[] = [];
  let unattributedRevenueCents = 0;
  const originsByContact = new Map<string, Set<string>>();
  const contactsByOrigin = new Map<string, Set<string>>();
  for (const lead of leadSources) {
    recordNamedOrigin(
      originsByContact,
      lead.contactId,
      lead.source,
      lead.campaign ?? "",
    );
    const originKey = attributionOriginKey(lead.source, lead.campaign ?? "");
    const contacts = contactsByOrigin.get(originKey) ?? new Set<string>();
    contacts.add(lead.contactId);
    contactsByOrigin.set(originKey, contacts);
  }

  let labelCounts = emptyAttributionLabelCounts();
  for (const lead of leadSources) {
    const labeled = labelStoredJoin({
      kind: "lead",
      source: lead.source,
      campaign: lead.campaign ?? "",
      contactId: lead.contactId,
      namedOriginCount: namedOriginCountForContact(originsByContact, lead.contactId),
    });
    labelCounts = addAttributionLabelCount(labelCounts, labeled.label);
  }

  for (const charge of chargeRows) {
    const fromLead = charge.contactId
      ? firstLeadByContact.get(charge.contactId)
      : undefined;
    const fromCustomer = charge.contactId
      ? customerSourceByContact.get(charge.contactId)
      : undefined;
    const source = normalizeAttributionSource(
      fromLead?.source || fromCustomer || (charge.contactId ? "stripe" : ""),
    );
    if (!charge.contactId) unattributedRevenueCents += charge.amountCents;
    revenue.push({
      source,
      campaign: fromLead?.campaign ?? "",
      cents: charge.amountCents,
    });
    const labeled = labelStoredJoin({
      kind: "charge",
      source,
      campaign: fromLead?.campaign ?? "",
      contactId: charge.contactId,
      namedOriginCount: namedOriginCountForContact(
        originsByContact,
        charge.contactId,
      ),
    });
    labelCounts = addAttributionLabelCount(labelCounts, labeled.label);
  }

  const rows = mergeAttributionRows({
    visits: visitRows.map((row) => ({
      source: row.source,
      campaign: row.campaign,
      count: Number(row.count),
    })),
    leads: leadRows.map((row) => ({
      source: row.source,
      campaign: row.campaign,
      count: Number(row.count),
    })),
    customers: customersForMerge,
    revenue,
  }).map((row) => {
    const originKey = attributionOriginKey(row.source, row.campaign);
    const contacts = contactsByOrigin.get(originKey) ?? new Set<string>();
    const assisted = [...contacts].some(
      (contactId) => namedOriginCountForContact(originsByContact, contactId) >= 2,
    );
    return {
      ...row,
      ...labelAttributionOrigin({
        source: row.source,
        campaign: row.campaign,
        assisted,
      }),
    };
  });

  return {
    rows,
    unattributedRevenueCents,
    websiteUrl: website?.publicUrl ?? "",
    labelCounts,
  };
}
