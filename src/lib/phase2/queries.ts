import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  attributionTouches,
  bookings,
  contacts,
  customers,
  events,
  integrationConnections,
  leadRecords,
  leadStages,
  payments,
  websites,
} from "@/lib/db/schema";

export async function getDashboardSnapshot(organizationId: string) {
  const db = getDb();
  if (!db) {
    return {
      contactCount: 0,
      openLeadCount: 0,
      customerCount: 0,
      paymentTotalCents: 0,
      paymentCount: 0,
      upcomingEvents: [] as { id: string; title: string; startsAt: Date | null }[],
      recentLeads: [] as { id: string; name: string; email: string | null; source: string }[],
      recentPayments: [] as { id: string; amountCents: number; currency: string; status: string }[],
      website: null as { publicUrl: string; provider: string; trackingId: string } | null,
      stripeConnected: false,
      stripeConfigured: false,
      stripeSynced: false,
      stripeLastError: null as string | null,
      topChannels: [] as { channel: string; count: number }[],
    };
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [contactCount] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(contacts)
    .where(eq(contacts.organizationId, organizationId));

  const openStages = await db
    .select()
    .from(leadStages)
    .where(
      and(
        eq(leadStages.organizationId, organizationId),
        eq(leadStages.isWon, false),
        eq(leadStages.isLost, false),
      ),
    );
  const openStageIds = openStages.map((stage) => stage.id);

  let openLeadCount = 0;
  if (openStageIds.length > 0) {
    const [openLeads] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(leadRecords)
      .where(
        and(
          eq(leadRecords.organizationId, organizationId),
          inArray(leadRecords.stageId, openStageIds),
        ),
      );
    openLeadCount = openLeads?.value ?? 0;
  }

  const [customerCount] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(customers)
    .where(eq(customers.organizationId, organizationId));

  const [paymentAgg] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(case when ${payments.kind} = 'refund' then 0 when ${payments.providerObjectId} like 'ch_%' then ${payments.amountCents} else 0 end), 0)::int`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        gte(payments.createdAt, monthStart),
      ),
    );

  const upcomingEvents = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
    })
    .from(events)
    .where(eq(events.organizationId, organizationId))
    .orderBy(desc(events.startsAt))
    .limit(5);

  const leadRows = await db
    .select({
      id: leadRecords.id,
      source: leadRecords.source,
      name: contacts.displayName,
      email: contacts.email,
    })
    .from(leadRecords)
    .innerJoin(contacts, eq(leadRecords.contactId, contacts.id))
    .where(eq(leadRecords.organizationId, organizationId))
    .orderBy(desc(leadRecords.createdAt))
    .limit(5);

  const recentPayments = await db
    .select({
      id: payments.id,
      amountCents: payments.amountCents,
      currency: payments.currency,
      status: payments.status,
    })
    .from(payments)
    .where(eq(payments.organizationId, organizationId))
    .orderBy(desc(payments.createdAt))
    .limit(5);

  const [website] = await db
    .select({
      publicUrl: websites.publicUrl,
      provider: websites.provider,
      trackingId: websites.trackingId,
    })
    .from(websites)
    .where(eq(websites.organizationId, organizationId))
    .limit(1);

  const connections = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.organizationId, organizationId));
  const stripe = connections.find((row) => row.providerKey === "stripe");

  const channelRows = await db
    .select({
      channel: attributionTouches.channel,
      count: sql<number>`count(*)::int`,
    })
    .from(attributionTouches)
    .where(eq(attributionTouches.organizationId, organizationId))
    .groupBy(attributionTouches.channel)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  return {
    contactCount: Number(contactCount?.value ?? 0),
    openLeadCount: Number(openLeadCount),
    customerCount: Number(customerCount?.value ?? 0),
    paymentTotalCents: Number(paymentAgg?.total ?? 0),
    paymentCount: Number(paymentAgg?.count ?? 0),
    upcomingEvents,
    recentLeads: leadRows,
    recentPayments,
    website: website ?? null,
    stripeConnected: stripe?.status === "connected",
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeSynced: Boolean(stripe?.lastSyncAt),
    stripeLastError: stripe?.lastError ?? null,
    topChannels: channelRows.map((row) => ({
      ...row,
      count: Number(row.count),
    })),
  };
}

export async function getCommerceSnapshot(organizationId: string) {
  const db = getDb();
  if (!db) {
    return {
      bookings: [],
      payments: [],
      people: [] as { id: string; displayName: string; email: string | null }[],
      stripe: null as null,
    };
  }

  const bookingRows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.organizationId, organizationId))
    .orderBy(desc(bookings.createdAt))
    .limit(50);

  const paymentRows = await db
    .select({
      payment: payments,
      person: {
        displayName: contacts.displayName,
        email: contacts.email,
      },
    })
    .from(payments)
    .leftJoin(contacts, eq(payments.contactId, contacts.id))
    .where(eq(payments.organizationId, organizationId))
    .orderBy(desc(payments.createdAt))
    .limit(50);

  const people = await db
    .select({
      id: contacts.id,
      displayName: contacts.displayName,
      email: contacts.email,
    })
    .from(contacts)
    .where(eq(contacts.organizationId, organizationId))
    .orderBy(asc(contacts.displayName))
    .limit(200);

  const [stripe] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.organizationId, organizationId),
        eq(integrationConnections.providerKey, "stripe"),
      ),
    )
    .limit(1);

  return {
    bookings: bookingRows,
    payments: paymentRows.map((row) => ({
      ...row.payment,
      person: row.payment.contactId
        ? {
            displayName: row.person?.displayName ?? "",
            email: row.person?.email ?? null,
          }
        : null,
    })),
    people,
    stripe: stripe ?? null,
  };
}
