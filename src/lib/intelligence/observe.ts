import { FOLLOW_UP_LEADS_STEP_TITLE } from "@/lib/growth/plan-draft";
import { extraShareClause } from "@/lib/growth/progress";
import { formatLeadOrigin } from "@/lib/marketing/named-link";
import { formatMoney } from "@/lib/money";

export type IntelligenceSource = {
  source: string
  campaign?: string
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
  activeGoalShare?: {
    title: string
    note: string
    rows?: { origin: string; count: number }[]
  } | null
  proposedSeoActionCount?: number
  proposedSeoSummary?: string
  businessBrainSaved?: boolean
  businessContextSaved?: boolean
  recordedKeywordCount?: number
  keywordReviewCount?: number
  serpNoteCount?: number
  knownCompetitorCount?: number
  contentGapCount?: number
  contentBriefCount?: number
  contentDraftCount?: number
  cmsPublishRequestCount?: number
  internalLinkCount?: number
  schemaFactCount?: number
  schemaReviewCount?: number
  geoNoteCount?: number
  geoQueryCount?: number
  geoHistoryCount?: number
  geoAuditGapCount?: number
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

const GENERIC_SOURCES = new Set([
  "direct",
  "website",
  "stripe",
  "unattributed",
  "manual",
  "website_campaign",
  "campaign",
]);

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
    const origin = formatLeadOrigin(topRevenue.source, topRevenue.campaign ?? "");
    observations.push({
      kind: "observation",
      title: "Revenue source",
      body: `Most recorded charge revenue is attributed to “${origin}” (${formatMoney(topRevenue.revenueCents)}). Attribution is imperfect, especially when checkout happens on another website.`,
      evidence: [`source:${origin}`, "payments ch_%"],
      href: "/app/marketing",
    });
  } else if (topLeads && topLeads.leads > 0) {
    const origin = formatLeadOrigin(topLeads.source, topLeads.campaign ?? "");
    observations.push({
      kind: "observation",
      title: "Lead source",
      body: `Most leads are coming from “${origin}” (${topLeads.leads}).`,
      evidence: [`source:${origin}`, "lead_records"],
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

  if (facts.activeGoalShare?.note) {
    observations.push({
      kind: "observation",
      title: "Goal number and share",
      body: `“${facts.activeGoalShare.title}”: ${facts.activeGoalShare.note}${extraShareClause(facts.activeGoalShare.rows)} Naming a share stays on Marketing. GroovGro will not buy ads.`,
      evidence: ["growth_goals live progress", "named share"],
      href: "/app/next-step",
    });
  }

  const seoCount = facts.proposedSeoActionCount ?? 0;
  if (seoCount > 0) {
    const example = (facts.proposedSeoSummary ?? "").replace(/\s+/g, " ").trim();
    observations.push({
      kind: "observation",
      title: "Search and website opportunity",
      body: `GroovGro observed Search Console and page-check evidence and proposed ${seoCount} review-only growth action${seoCount === 1 ? "" : "s"}.${example ? ` ${example}` : ""} GroovGro will not change the live website.`,
      evidence: ["seo_audits", "search_console_snapshots", "growth_actions.module=seo"],
      href: "/app/next-step",
    });
  }

  const keywordCount = facts.recordedKeywordCount ?? 0;
  const keywordReviewCount = facts.keywordReviewCount ?? 0;
  const serpNoteCount = facts.serpNoteCount ?? 0;
  const knownCompetitorCount = facts.knownCompetitorCount ?? 0;
  const contentGapCount = facts.contentGapCount ?? 0;
  const contentBriefCount = facts.contentBriefCount ?? 0;
  const contentDraftCount = facts.contentDraftCount ?? 0;
  const cmsPublishRequestCount = facts.cmsPublishRequestCount ?? 0;
  const internalLinkCount = facts.internalLinkCount ?? 0;
  const schemaFactCount = facts.schemaFactCount ?? 0;
  const schemaReviewCount = facts.schemaReviewCount ?? 0;
  const geoNoteCount = facts.geoNoteCount ?? 0;
  const geoQueryCount = facts.geoQueryCount ?? 0;
  const geoHistoryCount = facts.geoHistoryCount ?? 0;
  const geoAuditGapCount = facts.geoAuditGapCount ?? 0;
  if (keywordCount > 0) {
    observations.push({
      kind: "observation",
      title: "Search queries from Search Console",
      body: `GroovGro recorded ${keywordCount} search quer${keywordCount === 1 ? "y" : "ies"} from stored Search Console snapshots and ranked them from those numbers.${keywordReviewCount > 0 ? ` ${keywordReviewCount} ${keywordReviewCount === 1 ? "is" : "are"} marked worth a look.` : ""} This is an estimate, not search volume or a traffic forecast.`,
      evidence: ["keywords", "keyword_history", "search_console_snapshots"],
      href: "/app/seo",
    });
  }

  if (serpNoteCount > 0) {
    observations.push({
      kind: "observation",
      title: "Competitor notes you already saved",
      body: `The owner saved ${serpNoteCount} competitor ${serpNoteCount === 1 ? "note" : "notes"} from what they already see. GroovGro did not look these businesses up or scrape search results.`,
      evidence: ["serp_notes.source=owner"],
      href: "/app/seo",
    });
  }

  if (contentGapCount > 0) {
    observations.push({
      kind: "observation",
      title: "Search queries with no matching page GroovGro has read",
      body: `${contentGapCount} worth-a-look ${contentGapCount === 1 ? "query has" : "queries have"} no matching page among the pages GroovGro already read. GroovGro did not invent topics or create a page.`,
      evidence: ["content_gaps.status=gap"],
      href: "/app/seo",
    });
  }

  if (contentBriefCount > 0) {
    observations.push({
      kind: "observation",
      title: "Content briefs on the planner",
      body: `The owner saved ${contentBriefCount} content ${contentBriefCount === 1 ? "brief" : "briefs"} on the planner. GroovGro did not publish a page.`,
      evidence: ["content_briefs.source=owner"],
      href: "/app/seo",
    });
  }

  if (contentDraftCount > 0) {
    observations.push({
      kind: "observation",
      title: "Workspace content drafts",
      body: `${contentDraftCount} workspace ${contentDraftCount === 1 ? "draft is" : "drafts are"} saved from a brief. GroovGro did not publish them or change the live website.`,
      evidence: ["content_drafts.status=draft"],
      href: "/app/seo",
    });
  }

  if (cmsPublishRequestCount > 0) {
    observations.push({
      kind: "observation",
      title: "Drafts saved for later CMS review",
      body: `The owner saved ${cmsPublishRequestCount} ${cmsPublishRequestCount === 1 ? "draft" : "drafts"} for later review. GroovGro did not publish or change the live website.`,
      evidence: ["cms_publish_requests.status=review"],
      href: "/app/seo",
    });
  }

  if (internalLinkCount > 0) {
    observations.push({
      kind: "observation",
      title: "Internal link suggestions from pages already read",
      body: `${internalLinkCount} stored ${internalLinkCount === 1 ? "page mentions" : "pages mention"} another page title GroovGro already read. GroovGro did not add a link on the live website.`,
      evidence: ["internal_link_suggestions.source=stored_pages"],
      href: "/app/seo",
    });
  }

  if (schemaFactCount > 0) {
    observations.push({
      kind: "observation",
      title: "Estimated schema types from pages already read",
      body: `GroovGro estimated a schema type for ${schemaFactCount} ${schemaFactCount === 1 ? "page" : "pages"} it already read. These are estimates from the stored page group. GroovGro did not add schema to the live website.`,
      evidence: ["page_schema_facts.source=page_group"],
      href: "/app/seo",
    });
  }

  if (geoNoteCount > 0) {
    observations.push({
      kind: "observation",
      title: "AI visibility notes you already saved",
      body: `The owner saved ${geoNoteCount} AI visibility ${geoNoteCount === 1 ? "note" : "notes"} from what they already heard. GroovGro did not ask an AI system or scrape answers.`,
      evidence: ["geo_notes.source=owner"],
      href: "/app/seo",
    });
  }

  if (geoQueryCount > 0) {
    observations.push({
      kind: "observation",
      title: "Questions saved for later AI visibility",
      body: `The owner saved ${geoQueryCount} ${geoQueryCount === 1 ? "question" : "questions"} to remember. GroovGro did not ask an AI system or scrape answers.`,
      evidence: ["geo_queries.source=owner"],
      href: "/app/seo",
    });
  }

  if (geoHistoryCount > 0) {
    observations.push({
      kind: "observation",
      title: "AI visibility history you already saved",
      body: `The owner saved ${geoHistoryCount} visibility ${geoHistoryCount === 1 ? "snapshot" : "snapshots"} from what they already heard. GroovGro did not ask an AI system or scrape answers.`,
      evidence: ["geo_history.source=owner"],
      href: "/app/seo",
    });
  }

  if (geoAuditGapCount > 0) {
    observations.push({
      kind: "observation",
      title: "Citation gaps from saved visibility history",
      body: `${geoAuditGapCount} library ${geoAuditGapCount === 1 ? "question has" : "questions have"} a citation or mention gap in the latest saved snapshot. GroovGro did not ask an AI system or treat one answer as truth.`,
      evidence: ["geo_audits.status=citation_gap"],
      href: "/app/seo",
    });
  }

  if (facts.businessContextSaved) {
    observations.push({
      kind: "observation",
      title: "Business context for later search work",
      body: "The owner saved who to reach, problems they have, known competitors, what makes the business different, or claims to avoid. GroovGro will not look up competitors or write pages from this yet.",
      evidence: ["business_brains seo context"],
      href: "/app/business",
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

  if (seoCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Review the SEO opportunity",
      body: "Open Next step to read what GroovGro found and what it recommends. Approving does not change the live website, Search Console, or ads.",
      evidence: ["growth_actions.module=seo status=proposed"],
      href: "/app/next-step",
    });
  }

  if (facts.websiteConnected && keywordReviewCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Review the ranked search queries",
      body: "Open SEO to read which stored Search Console queries GroovGro marked worth a look. This is an estimate from stored numbers. GroovGro will not change the live website or buy keyword data.",
      evidence: ["keywords.opportunity_label=review"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    facts.businessBrainSaved &&
    !facts.businessContextSaved
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Add business context for later search work",
      body: "On Business, add who you want to reach, problems they are trying to solve, competitors you already know, what makes the business different, or claims GroovGro must never make. GroovGro will not look up competitors or change the live website.",
      evidence: ["business_brains seo context missing"],
      href: "/app/business",
    });
  }

  if (
    facts.websiteConnected &&
    keywordCount > 0 &&
    knownCompetitorCount > 0 &&
    serpNoteCount === 0
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Save a competitor you already see",
      body: "On SEO, save a note about a competitor you already see for a recorded query. GroovGro will not look anyone up or scrape search results.",
      evidence: ["serp_notes missing"],
      href: "/app/seo",
    });
  }

  if (facts.websiteConnected && contentGapCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Review queries with no matching page",
      body: "Open SEO to read which worth-a-look queries GroovGro could not find on pages it already read. GroovGro will not create a page.",
      evidence: ["content_gaps.status=gap"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    contentGapCount > 0 &&
    contentBriefCount === 0
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Save a content brief to the planner",
      body: "On SEO, save a brief for a missing-page query. GroovGro will not publish a page.",
      evidence: ["content_briefs missing"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    contentBriefCount > 0 &&
    contentDraftCount === 0
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Write a workspace draft from a brief",
      body: "On SEO, write a workspace draft from a saved brief. GroovGro will not publish it or change the live website.",
      evidence: ["content_drafts missing"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    contentDraftCount > 0 &&
    cmsPublishRequestCount === 0
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Save a draft for later CMS review",
      body: "On SEO, save a workspace draft for later review. GroovGro will not publish or change the live website.",
      evidence: ["cms_publish_requests missing"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    (internalLinkCount > 0 || schemaReviewCount > 0)
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Review link and schema facts from pages already read",
      body: "Open SEO to read link suggestions and estimated schema types from pages GroovGro already read. GroovGro will not add links or schema to the live website.",
      evidence: ["internal_link_suggestions", "page_schema_facts"],
      href: "/app/seo",
    });
  }

  if (facts.websiteConnected && keywordCount > 0 && geoNoteCount === 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Save what you already hear from AI",
      body: "On SEO, save what you already heard when you asked an AI system about this business. GroovGro will not ask an AI system or scrape answers.",
      evidence: ["geo_notes missing"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    (keywordCount > 0 || geoNoteCount > 0) &&
    geoQueryCount === 0
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Save a question to remember for later AI visibility",
      body: "On SEO, save a question you already care about. GroovGro will not ask an AI system or scrape answers.",
      evidence: ["geo_queries missing"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    geoQueryCount > 0 &&
    geoHistoryCount === 0
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Save visibility history from what you already heard",
      body: "On SEO, save another snapshot of what you already heard for a library question. GroovGro will not ask an AI system, scrape answers, or treat one answer as truth.",
      evidence: ["geo_history missing"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    geoHistoryCount > 0 &&
    geoAuditGapCount > 0
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Review citation gaps from saved history",
      body: "Open SEO to read which library questions the latest saved snapshot marked as not mentioned or not cited. GroovGro will not ask an AI system, scrape answers, or treat one answer as truth.",
      evidence: ["geo_audits.status=citation_gap"],
      href: "/app/seo",
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
    `seo_actions=${facts.proposedSeoActionCount ?? 0}`,
    `business_context=${facts.businessContextSaved ? "yes" : "no"}`,
    `keywords=${facts.recordedKeywordCount ?? 0}`,
    `keyword_review=${facts.keywordReviewCount ?? 0}`,
    `serp_notes=${facts.serpNoteCount ?? 0}`,
    `known_competitors=${facts.knownCompetitorCount ?? 0}`,
    `content_gaps=${facts.contentGapCount ?? 0}`,
    `content_briefs=${facts.contentBriefCount ?? 0}`,
    `content_drafts=${facts.contentDraftCount ?? 0}`,
    `cms_publish=${facts.cmsPublishRequestCount ?? 0}`,
    `internal_links=${facts.internalLinkCount ?? 0}`,
    `schema_facts=${facts.schemaFactCount ?? 0}`,
    `schema_review=${facts.schemaReviewCount ?? 0}`,
    `geo_notes=${facts.geoNoteCount ?? 0}`,
    `geo_queries=${facts.geoQueryCount ?? 0}`,
    `geo_history=${facts.geoHistoryCount ?? 0}`,
    `geo_audits=${facts.geoAuditGapCount ?? 0}`,
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
