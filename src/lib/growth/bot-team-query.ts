import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  botProposalItems,
  botProposalPacks,
  brandSettings,
  brandVoiceProfiles,
  contentBriefs,
  offers,
  payments,
  websiteDiscoveredPages,
} from "@/lib/db/schema";
import {
  BOT_STATUS_APPROVED,
  BOT_STATUS_PROPOSED,
  describeBotInboxHeading,
  describeBotSeat,
  type BotItemStatus,
  type BotSeat,
} from "@/lib/growth/bot-team";

export type BotProposalRow = {
  id: string
  packId: string
  seat: BotSeat
  property: string
  source: string
  sourceRange: string
  externalId: string
  type: string
  priority: number
  evidence: string
  draft: string
  expectedEffect: string
  status: BotItemStatus
};

export async function getBotProposalInbox(
  organizationId: string,
  seat: BotSeat,
): Promise<{ heading: string; items: BotProposalRow[] }> {
  const db = getDb();
  if (!db || !organizationId) {
    return { heading: describeBotInboxHeading(seat, { proposed: 0, approved: 0 }), items: [] };
  }
  const rows = await db
    .select({
      id: botProposalItems.id,
      packId: botProposalItems.packId,
      seat: botProposalPacks.seat,
      property: botProposalPacks.property,
      source: botProposalPacks.source,
      sourceRange: botProposalPacks.sourceRange,
      externalId: botProposalItems.externalId,
      type: botProposalItems.type,
      priority: botProposalItems.priority,
      evidence: botProposalItems.evidence,
      draft: botProposalItems.draft,
      expectedEffect: botProposalItems.expectedEffect,
      status: botProposalItems.status,
    })
    .from(botProposalItems)
    .innerJoin(botProposalPacks, eq(botProposalItems.packId, botProposalPacks.id))
    .where(
      and(
        eq(botProposalItems.organizationId, organizationId),
        eq(botProposalPacks.seat, seat),
      ),
    )
    .orderBy(desc(botProposalItems.createdAt))
    .limit(40);

  const items = rows.map((row) => ({
    ...row,
    seat,
    status: row.status as BotItemStatus,
  }));
  const proposed = items.filter((item) => item.status === BOT_STATUS_PROPOSED).length;
  const approved = items.filter((item) => item.status === BOT_STATUS_APPROVED).length;
  return {
    heading: describeBotInboxHeading(seat, { proposed, approved }),
    items,
  };
}

export async function getBotTeamPayload(organizationId: string, seat: BotSeat) {
  const db = getDb();
  const meta = describeBotSeat(seat);
  if (!db || !organizationId) {
    return emptyPayload(seat);
  }

  const [brand] = await db
    .select({
      businessName: brandSettings.businessName,
      description: brandSettings.description,
      targetCustomers: brandSettings.targetCustomers,
    })
    .from(brandSettings)
    .where(eq(brandSettings.organizationId, organizationId))
    .limit(1);
  const [voice] = await db
    .select({
      tone: brandVoiceProfiles.tone,
      audience: brandVoiceProfiles.audience,
      doSay: brandVoiceProfiles.doSay,
      dontSay: brandVoiceProfiles.dontSay,
    })
    .from(brandVoiceProfiles)
    .where(eq(brandVoiceProfiles.organizationId, organizationId))
    .limit(1);
  const offerRows = await db
    .select({
      name: offers.name,
      description: offers.description,
      offerType: offers.offerType,
      priceCents: offers.priceCents,
    })
    .from(offers)
    .where(eq(offers.organizationId, organizationId))
    .limit(20);

  const brandCard = {
    businessName: brand?.businessName ?? "",
    description: brand?.description ?? "",
    targetCustomers: brand?.targetCustomers ?? "",
    voice: voice ?? { tone: "", audience: "", doSay: "", dontSay: "" },
    offers: offerRows.map((row) => ({
      name: row.name,
      description: row.description,
      offerType: row.offerType,
      savedPriceCents: row.priceCents ?? null,
    })),
  };

  if (seat === "draftgro") {
    return {
      seat,
      brand: brandCard,
      walls: meta.walls,
    };
  }

  if (seat === "writegro") {
    const [briefs, pages] = await Promise.all([
      db
        .select({
          title: contentBriefs.title,
          query: contentBriefs.query,
          audience: contentBriefs.audience,
          outline: contentBriefs.outline,
          status: contentBriefs.status,
        })
        .from(contentBriefs)
        .where(eq(contentBriefs.organizationId, organizationId))
        .orderBy(desc(contentBriefs.createdAt))
        .limit(12),
      db
        .select({
          url: websiteDiscoveredPages.url,
          title: websiteDiscoveredPages.title,
          label: websiteDiscoveredPages.label,
        })
        .from(websiteDiscoveredPages)
        .where(eq(websiteDiscoveredPages.organizationId, organizationId))
        .orderBy(desc(websiteDiscoveredPages.lastSeenAt))
        .limit(40),
    ]);
    return {
      seat,
      brand: brandCard,
      briefs,
      publicPages: pages.filter((row) => row.url),
      walls: meta.walls,
    };
  }

  const paymentRows = await db
    .select({
      amountCents: payments.amountCents,
      currency: payments.currency,
      kind: payments.kind,
      status: payments.status,
      providerObjectId: payments.providerObjectId,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(eq(payments.organizationId, organizationId))
    .orderBy(desc(payments.createdAt))
    .limit(25);

  return {
    seat,
    notice:
      "These are payment copies GroovGro already stored. They are not QuickBooks balances.",
    payments: paymentRows.map((row) => ({
      amountCents: row.amountCents,
      currency: row.currency,
      kind: row.kind,
      status: row.status,
      providerObjectId: row.providerObjectId,
      createdAt: row.createdAt.toISOString(),
    })),
    walls: meta.walls,
  };
}

function emptyPayload(seat: BotSeat) {
  const meta = describeBotSeat(seat);
  if (seat === "booksgro") {
    return {
      seat,
      notice:
        "These are payment copies GroovGro already stored. They are not QuickBooks balances.",
      payments: [],
      walls: meta.walls,
    };
  }
  if (seat === "writegro") {
    return {
      seat,
      brand: null,
      briefs: [],
      publicPages: [],
      walls: meta.walls,
    };
  }
  return { seat, brand: null, walls: meta.walls };
}
