import { FOLLOW_UP_LEADS_STEP_TITLE } from "@/lib/growth/plan-draft";
import { formatMoney } from "@/lib/money";

export type IntelligenceSource = {
  source: string
  visits: number
  leads: number
  customers: number
  revenueCents: number
};

export type IntelligenceFacts = {
  websiteConnected: boolean
  stripeConnected: boolean
  openLeadCount: number
  customerCount: number
  contactCount: number
  paymentTotalCents: number
  chargeCountThisMonth: number
  unattributedRevenueCents: number
  upcomingEventCount: number
  sources: IntelligenceSource[]
  showFinancials: boolean
};

export type InsightItem = {
  kind: "observation" | "recommendation"
  title: string
  body: string
  evidence: string[]
  href?: string
};

export type IntelligenceBrief = {
  headline: string
  observations: InsightItem[]
  recommendations: InsightItem[]
};

const GENERIC_SOURCES = new Set(["direct", "website", "stripe", "unattributed", "manual"]);

export function buildIntelligenceBrief(facts: IntelligenceFacts): IntelligenceBrief {
  const observations: InsightItem[] = [];
  const recommendations: InsightItem[] = [];

  const topRevenue = [...facts.sources].sort(
    (a, b) => b.revenueCents - a.revenueCents,
  )[0];
  const topLeads = [...facts.sources].sort((a, b) => b.leads - a.leads)[0];
  const namedSources = facts.sources.filter(
    (row) => !GENERIC_SOURCES.has(row.source) && (row.leads > 0 || row.visits > 0),
  );

  if (facts.showFinancials && facts.chargeCountThisMonth > 0) {
    observations.push({
      kind: "observation",
      title: "Payments this month",
      body: `${facts.chargeCountThisMonth} Stripe charge${facts.chargeCountThisMonth === 1 ? "" : "s"} total ${formatMoney(facts.paymentTotalCents)} this month. GroovGro only records those events. It does not take the payment or change checkout.`,
      evidence: ["payments.kind=charge", "provider_object_id like ch_%"],
      href: "/app/commerce",
    });
  } else if (facts.stripeConnected) {
    observations.push({
      kind: "observation",
      title: "No charges this month yet",
      body: "Stripe is connected, but GroovGro has not recorded a charge row for this month. Existing checkout on the connected business site still runs in Stripe, not in GroovGro.",
      evidence: ["integration_connections.stripe"],
      href: "/app/commerce",
    });
  } else {
    observations.push({
      kind: "observation",
      title: "Stripe is not marked connected",
      body: "This workspace is not connected to Stripe yet, so payments will not show here. Do not create a new Stripe account for GroovGro.",
      evidence: ["integration_connections.stripe missing"],
      href: "/app/next-step",
    });
  }

  observations.push({
    kind: "observation",
    title: "People in the workspace",
    body: `${facts.openLeadCount} open lead${facts.openLeadCount === 1 ? "" : "s"}, ${facts.customerCount} customer${facts.customerCount === 1 ? "" : "s"}, and ${facts.contactCount} contact${facts.contactCount === 1 ? "" : "s"}.`,
    evidence: ["lead_records", "customers", "contacts"],
    href:
      facts.openLeadCount > 0 || facts.contactCount === 0
        ? "/app/next-step"
        : "/app/crm",
  });

  if (facts.showFinancials && topRevenue && topRevenue.revenueCents > 0) {
    observations.push({
      kind: "observation",
      title: "Revenue source",
      body: `Most recorded charge revenue is attributed to “${topRevenue.source}” (${formatMoney(topRevenue.revenueCents)}). Attribution is imperfect, especially when checkout happens on another website.`,
      evidence: [`source:${topRevenue.source}`, "payments ch_%"],
      href: "/app/marketing",
    });
  } else if (topLeads && topLeads.leads > 0) {
    observations.push({
      kind: "observation",
      title: "Lead source",
      body: `Most leads are coming from “${topLeads.source}” (${topLeads.leads}).`,
      evidence: [`source:${topLeads.source}`, "lead_records"],
      href: "/app/marketing",
    });
  }

  if (facts.showFinancials && facts.unattributedRevenueCents > 0) {
    observations.push({
      kind: "observation",
      title: "Unattributed charges",
      body: `${formatMoney(facts.unattributedRevenueCents)} in Stripe charges has no person email yet, so GroovGro cannot attach a marketing source.`,
      evidence: ["payments.contact_id is null"],
      href: "/app/commerce",
    });
  }

  if (!facts.websiteConnected) {
    observations.push({
      kind: "observation",
      title: "Website not connected",
      body: "No existing website is connected, so visits and campaign clicks cannot be recorded.",
      evidence: ["websites missing"],
      href: "/app/next-step",
    });
  }

  if (facts.upcomingEventCount > 0) {
    observations.push({
      kind: "observation",
      title: "Upcoming events",
      body: `${facts.upcomingEventCount} event${facts.upcomingEventCount === 1 ? "" : "s"} on the calendar.`,
      evidence: ["events"],
      href: "/app/events",
    });
  }

  if (facts.openLeadCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: FOLLOW_UP_LEADS_STEP_TITLE,
      body: "Give each open lead a next step on Next step. GroovGro will not email them.",
      evidence: ["open lead_records"],
      href: "/app/next-step",
    });
  }

  if (facts.showFinancials && facts.unattributedRevenueCents > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Match charges to people",
      body: "When a checkout collects an email, GroovGro can attach the payment to a contact. Do not change the live checkout webhook on the business website.",
      evidence: ["unattributed payments"],
      href: "/app/commerce",
    });
  }

  if (facts.websiteConnected && namedSources.length === 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Name the campaign on shared links",
      body: "On Marketing, type where you will share and a name for this share, then copy the link. GroovGro will not buy ads.",
      evidence: ["attribution sources are generic"],
      href: "/app/marketing",
    });
  }

  if (!facts.websiteConnected) {
    recommendations.push({
      kind: "recommendation",
      title: "Connect the existing website",
      body: "Open Next step to connect the site you already have. Do not move the site into GroovGro.",
      evidence: ["websites missing"],
      href: "/app/next-step",
    });
  }

  if (!facts.stripeConnected) {
    recommendations.push({
      kind: "recommendation",
      title: "Connect Stripe in this workspace",
      body: "Open Next step to connect so GroovGro can read a copy of payments. Use the existing Stripe account. It must not replace live checkout.",
      evidence: ["stripe not connected"],
      href: "/app/next-step",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Keep recording the journey",
      body: "Website, leads, customers, and Stripe charges are in a usable starting place. Open Next step. GroovGro will not start ads.",
      evidence: ["dashboard snapshot"],
      href: "/app/next-step",
    });
  }

  return {
    headline: headlineFor(facts),
    observations,
    recommendations,
  };
}

export function briefToPlainText(brief: IntelligenceBrief): string {
  const lines = [
    brief.headline,
    "",
    "Observations",
    ...brief.observations.map((item) => `- ${item.title}: ${item.body}`),
    "",
    "Recommended next steps (you do these; GroovGro will not)",
    ...brief.recommendations.map((item) => `- ${item.title}: ${item.body}`),
  ];
  return lines.join("\n");
}

export function factsSummary(facts: IntelligenceFacts): string {
  return [
    `open_leads=${facts.openLeadCount}`,
    `customers=${facts.customerCount}`,
    `contacts=${facts.contactCount}`,
    `charges_this_month=${facts.chargeCountThisMonth}`,
    facts.showFinancials ? `revenue_cents=${facts.paymentTotalCents}` : "financials=hidden",
    `unattributed_cents=${facts.showFinancials ? facts.unattributedRevenueCents : "hidden"}`,
    `website=${facts.websiteConnected ? "yes" : "no"}`,
    `stripe=${facts.stripeConnected ? "yes" : "no"}`,
  ].join(" ");
}

function headlineFor(facts: IntelligenceFacts): string {
  if (!facts.websiteConnected && !facts.stripeConnected) {
    return "Connect the existing website and Stripe so GroovGro can explain what is happening.";
  }
  if (facts.openLeadCount > 0 && facts.chargeCountThisMonth > 0) {
    return "Leads are waiting, and Stripe charges are being recorded for this month.";
  }
  if (facts.chargeCountThisMonth > 0) {
    return "Stripe charges are landing in GroovGro. Checkout itself is unchanged.";
  }
  if (facts.openLeadCount > 0) {
    return "Leads are in the workspace, but GroovGro has not recorded a charge this month.";
  }
  return "Not enough connected activity yet to explain growth. Keep the website snippet and Stripe listener in place.";
}
