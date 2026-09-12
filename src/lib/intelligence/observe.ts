import { GENERIC_ATTRIBUTION_SOURCES } from "@/lib/attribution-labels";
import {
  channelScoreFactsFromCounts,
  channelsWithEvidence,
  scoreGrowthChannels,
} from "@/lib/growth/channel-score";
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
  channelCompareCount?: number
  attributionDirectCount?: number
  attributionAssistedCount?: number
  attributionEstimatedCount?: number
  attributionUnknownCount?: number
  beforeAfterLookCount?: number
  executionRequestCount?: number
  competitorSiteCount?: number
  competitorLookCount?: number
  competitorPageGapCount?: number
  competeMoveCount?: number
  competeMoveDoneCount?: number
  competeMovePlannedCount?: number
  competitorGapBriefCount?: number
  contentGapBriefCount?: number
  draftOfferCheckCount?: number
  draftMissingOfferCount?: number
  draftNoOfferToCheckCount?: number
  draftDifferenceCheckCount?: number
  draftMissingDifferenceCount?: number
  draftNoDifferenceToCheckCount?: number
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

const GENERIC_SOURCES = GENERIC_ATTRIBUTION_SOURCES;

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
  const attributionDirectCount = facts.attributionDirectCount ?? 0;
  const attributionAssistedCount = facts.attributionAssistedCount ?? 0;
  const attributionEstimatedCount = facts.attributionEstimatedCount ?? 0;
  const attributionUnknownCount = facts.attributionUnknownCount ?? 0;
  const geoNoteCount = facts.geoNoteCount ?? 0;
  const geoQueryCount = facts.geoQueryCount ?? 0;
  const geoHistoryCount = facts.geoHistoryCount ?? 0;
  const geoAuditGapCount = facts.geoAuditGapCount ?? 0;
  const beforeAfterLookCount = facts.beforeAfterLookCount ?? 0;
  const executionRequestCount = facts.executionRequestCount ?? 0;
  const competitorSiteCount = facts.competitorSiteCount ?? 0;
  const competitorLookCount = facts.competitorLookCount ?? 0;
  const competitorPageGapCount = facts.competitorPageGapCount ?? 0;
  const competeMoveCount = facts.competeMoveCount ?? 0;
  const competeMoveDoneCount = facts.competeMoveDoneCount ?? 0;
  const competeMovePlannedCount =
    facts.competeMovePlannedCount ??
    Math.max(0, competeMoveCount - competeMoveDoneCount);
  const competitorGapBriefCount = facts.competitorGapBriefCount ?? 0;
  const contentGapBriefCount = facts.contentGapBriefCount ?? 0;
  const draftOfferCheckCount = facts.draftOfferCheckCount ?? 0;
  const draftMissingOfferCount = facts.draftMissingOfferCount ?? 0;
  const draftNoOfferToCheckCount = facts.draftNoOfferToCheckCount ?? 0;
  const draftDifferenceCheckCount = facts.draftDifferenceCheckCount ?? 0;
  const draftMissingDifferenceCount = facts.draftMissingDifferenceCount ?? 0;
  const draftNoDifferenceToCheckCount = facts.draftNoDifferenceToCheckCount ?? 0;
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

  if (competitorSiteCount > 0) {
    observations.push({
      kind: "observation",
      title: "Competitor websites you asked GroovGro to read",
      body: `${competitorSiteCount} competitor ${competitorSiteCount === 1 ? "website is" : "websites are"} saved.${competitorLookCount > 0 ? ` GroovGro read ${competitorLookCount}.` : " GroovGro has not read them yet."} This is a look at a site you named, including how they sell and market.${competitorLookCount > 0 ? " SEO can show how those sites compare to what you sell." : ""} GroovGro did not scrape Google, copy their words, or buy ads.`,
      evidence: ["competitor_sites"],
      href: "/app/seo",
    });
  }

  if (competitorLookCount >= 2) {
    observations.push({
      kind: "observation",
      title: "How saved competitor websites compare",
      body: `GroovGro compared ${competitorLookCount} competitor websites you named to what you sell. This is from sites you asked it to read, not a Google scrape, and not a reason to copy their words or buy ads.`,
      evidence: ["competitor_sites.looked_at"],
      href: "/app/seo",
    });
  }

  if (competeMoveCount > 0) {
    observations.push({
      kind: "observation",
      title: "Compete moves you said you will do",
      body: `The owner saved ${competeMoveCount} ${competeMoveCount === 1 ? "move" : "moves"} they will do.${competeMoveDoneCount > 0 ? ` ${competeMoveDoneCount} ${competeMoveDoneCount === 1 ? "is" : "are"} marked done.` : ""}${competeMovePlannedCount > 0 ? ` ${competeMovePlannedCount} ${competeMovePlannedCount === 1 ? "is" : "are"} still planned.` : competeMoveDoneCount > 0 ? " None are still planned." : ""} GroovGro did not do that work or change the live website.`,
      evidence: ["compete_moves.source=owner"],
      href: "/app/seo",
    });
  }

  if (competitorPageGapCount > 0) {
    const remainingCompetitorGapBriefs = Math.max(
      0,
      competitorPageGapCount - competitorGapBriefCount,
    );
    const remainingNote =
      competitorGapBriefCount <= 0
        ? ""
        : remainingCompetitorGapBriefs <= 0
          ? " All of those already have a brief on the planner."
          : ` ${remainingCompetitorGapBriefs} still ${remainingCompetitorGapBriefs === 1 ? "has" : "have"} no brief on the planner.`;
    observations.push({
      kind: "observation",
      title: "Competitor page topics GroovGro has not read on your site",
      body: `${competitorPageGapCount} topic${competitorPageGapCount === 1 ? "" : "s"} on competitor websites you named ${competitorPageGapCount === 1 ? "has" : "have"} no matching page among the pages GroovGro already read.${remainingNote} This is not a reason to copy their words or create a page.`,
      evidence: ["competitor_sites.page_gaps"],
      href: "/app/seo",
    });
  }

  if (contentGapCount > 0) {
    const remainingContentGapBriefs = Math.max(
      0,
      contentGapCount - contentGapBriefCount,
    );
    const remainingNote =
      contentGapBriefCount <= 0
        ? ""
        : remainingContentGapBriefs <= 0
          ? " All of those already have a brief on the planner."
          : ` ${remainingContentGapBriefs} still ${remainingContentGapBriefs === 1 ? "has" : "have"} no brief on the planner.`;
    observations.push({
      kind: "observation",
      title: "Search queries with no matching page GroovGro has read",
      body: `${contentGapCount} worth-a-look ${contentGapCount === 1 ? "query has" : "queries have"} no matching page among the pages GroovGro already read.${remainingNote} GroovGro did not invent topics or create a page.`,
      evidence: ["content_gaps.status=gap"],
      href: "/app/seo",
    });
  }

  if (contentBriefCount > 0) {
    const remainingDrafts = Math.max(0, contentBriefCount - contentDraftCount);
    const remainingDraftNote =
      contentDraftCount <= 0
        ? ""
        : remainingDrafts <= 0
          ? " All of those already have a workspace draft."
          : ` ${remainingDrafts} still ${remainingDrafts === 1 ? "needs" : "need"} a workspace draft.`;
    observations.push({
      kind: "observation",
      title: "Content briefs on the planner",
      body: `The owner saved ${contentBriefCount} content ${contentBriefCount === 1 ? "brief" : "briefs"} on the planner.${competitorGapBriefCount > 0 ? ` ${competitorGapBriefCount} ${competitorGapBriefCount === 1 ? "is" : "are"} from a competitor page topic.` : ""}${contentGapBriefCount > 0 ? ` ${contentGapBriefCount} ${contentGapBriefCount === 1 ? "is" : "are"} from a missing-page query.` : ""}${remainingDraftNote} GroovGro did not publish a page or copy a competitor.`,
      evidence: ["content_briefs"],
      href: "/app/seo",
    });
  }

  if (contentDraftCount > 0) {
    const remainingReviews = Math.max(
      0,
      contentDraftCount - cmsPublishRequestCount,
    );
    const remainingReviewNote =
      cmsPublishRequestCount <= 0
        ? ""
        : remainingReviews <= 0
          ? " All of those are already saved for later review."
          : ` ${remainingReviews} ${remainingReviews === 1 ? "is" : "are"} still not saved for later review.`;
    observations.push({
      kind: "observation",
      title: "Workspace content drafts",
      body: `${contentDraftCount} workspace ${contentDraftCount === 1 ? "draft is" : "drafts are"} saved from a brief.${remainingReviewNote} GroovGro did not publish them or change the live website.`,
      evidence: ["content_drafts.status=draft"],
      href: "/app/seo",
    });
  }

  if (draftOfferCheckCount > 0) {
    const namedCount =
      draftOfferCheckCount - draftMissingOfferCount - draftNoOfferToCheckCount;
    observations.push({
      kind: "observation",
      title: "Competitor-topic drafts checked against what you sell",
      body: `GroovGro checked ${draftOfferCheckCount} competitor-topic ${draftOfferCheckCount === 1 ? "draft" : "drafts"} against saved offers.${namedCount > 0 ? ` ${namedCount} name a saved offer.` : ""}${draftMissingOfferCount > 0 ? ` ${draftMissingOfferCount} ${draftMissingOfferCount === 1 ? "does" : "do"} not name a saved offer yet.` : ""}${draftNoOfferToCheckCount > 0 ? ` ${draftNoOfferToCheckCount} cannot be checked until you save what you sell.` : ""} GroovGro did not publish or change the live website.`,
      evidence: ["content_drafts.offer_check"],
      href: "/app/seo",
    });
  }

  if (draftDifferenceCheckCount > 0) {
    const namedCount =
      draftDifferenceCheckCount -
      draftMissingDifferenceCount -
      draftNoDifferenceToCheckCount;
    observations.push({
      kind: "observation",
      title: "Competitor-topic drafts checked against what makes you different",
      body: `GroovGro checked ${draftDifferenceCheckCount} competitor-topic ${draftDifferenceCheckCount === 1 ? "draft" : "drafts"} against what makes this business different.${namedCount > 0 ? ` ${namedCount} name that difference.` : ""}${draftMissingDifferenceCount > 0 ? ` ${draftMissingDifferenceCount} ${draftMissingDifferenceCount === 1 ? "does" : "do"} not name it yet.` : ""}${draftNoDifferenceToCheckCount > 0 ? ` ${draftNoDifferenceToCheckCount} cannot be checked until you save what makes the business different.` : ""} GroovGro did not publish or change the live website.`,
      evidence: ["content_drafts.difference_check"],
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

  const channelScores = scoreGrowthChannels(
    channelScoreFactsFromCounts({
      openLeadCount: facts.openLeadCount,
      proposedSeoActionCount: facts.proposedSeoActionCount,
      keywordReviewCount: facts.keywordReviewCount,
      contentGapCount,
      contentBriefCount,
      contentDraftCount,
      geoAuditGapCount,
    }),
  );
  const comparable = channelsWithEvidence(channelScores);
  if (comparable.length > 0) {
    const names = comparable.map((row) => row.title).join(", ");
    observations.push({
      kind: "observation",
      title: "What stored evidence says to compare",
      body: `${comparable.length} stored ${comparable.length === 1 ? "channel looks" : "channels look"} stronger from workspace facts (${names}). GroovGro did not change Next step, buy ads, or run work.`,
      evidence: ["channel_scores.source=stored_workspace"],
      href: "/app/intelligence",
    });
  }

  const labeledJoinCount =
    attributionDirectCount +
    attributionAssistedCount +
    attributionEstimatedCount +
    attributionUnknownCount;
  if (labeledJoinCount > 0) {
    observations.push({
      kind: "observation",
      title: "How sure GroovGro is about stored joins",
      body: `GroovGro labeled ${labeledJoinCount} stored ${labeledJoinCount === 1 ? "join" : "joins"}: ${attributionDirectCount} DIRECT, ${attributionAssistedCount} ASSISTED, ${attributionEstimatedCount} ESTIMATED, and ${attributionUnknownCount} UNKNOWN. GroovGro did not invent a keyword, AI-referral, or ad-click path.`,
      evidence: ["attribution_labels.source=stored_join"],
      href: "/app/marketing",
    });
  }

  if (beforeAfterLookCount > 0) {
    observations.push({
      kind: "observation",
      title: "What a stored before and after shows",
      body: `${beforeAfterLookCount} Goal${beforeAfterLookCount === 1 ? " has" : "s have"} a stored before and after from saved Goal numbers. GroovGro did not run an experiment, buy ads, or change the plan.`,
      evidence: ["before_after_looks.source=stored_goal"],
      href: "/app/next-step",
    });
  }

  if (executionRequestCount > 0) {
    observations.push({
      kind: "observation",
      title: "Approved work saved for later",
      body: `The owner saved ${executionRequestCount} ${executionRequestCount === 1 ? "piece" : "pieces"} of approved work for later. GroovGro did not run ${executionRequestCount === 1 ? "it" : "them"}, buy ads, or change the live website.`,
      evidence: ["execution_requests.status=review"],
      href: "/app/next-step",
    });
  }

  if (facts.businessContextSaved) {
    observations.push({
      kind: "observation",
      title: "Business context for later search work",
      body: "The owner saved who to reach, problems they have, known competitors, what makes the business different, or claims to avoid. This form still does not look up competitors or write pages from this yet. Competitor looks live on SEO from a website you name.",
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

  if (
    facts.websiteConnected &&
    attributionDirectCount + attributionAssistedCount + attributionEstimatedCount > 0
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Read how sure GroovGro is about stored joins",
      body: "Open Marketing to read DIRECT, ASSISTED, ESTIMATED, and UNKNOWN labels on stored people-to-revenue joins. GroovGro will not buy ads, invent a keyword or AI-referral path, or change checkout.",
      evidence: ["attribution_labels.source=stored_join"],
      href: "/app/marketing",
    });
  }

  if (facts.websiteConnected && beforeAfterLookCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Read the stored before and after",
      body: "Open Next step to read the first stored Goal number next to the latest stored Goal number. This is not an experiment GroovGro ran. GroovGro will not buy ads or change the plan.",
      evidence: ["before_after_looks.source=stored_goal"],
      href: "/app/next-step",
    });
  }

  if (facts.websiteConnected && executionRequestCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Read the later-run queue",
      body: "Open Next step to read approved work saved for later. GroovGro will not run it, buy ads, or change the live website.",
      evidence: ["execution_requests.status=review"],
      href: "/app/next-step",
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
      body: "On Business, add who you want to reach, problems they are trying to solve, competitors you already know, what makes the business different, or claims GroovGro must never make. This form still does not look up competitors or change the live website.",
      evidence: ["business_brains seo context missing"],
      href: "/app/business",
    });
  }

  if (
    facts.websiteConnected &&
    (keywordCount > 0 || Boolean(facts.businessBrainSaved)) &&
    competitorSiteCount < 2
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Run a search to find another competitor",
      body: "On SEO, open a suggested search yourself, then save a website you found. GroovGro will not search Google.",
      evidence: ["competitor_searches.owner_run"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    knownCompetitorCount > 0 &&
    competitorSiteCount === 0
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Save a competitor website you already know",
      body: "On SEO, save a competitor website you already know. GroovGro can read that public page. It will not scrape Google or invent who you compete with.",
      evidence: ["competitor_sites missing"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    (competitorLookCount > 0 || competitorPageGapCount > 0) &&
    competeMoveCount === 0
  ) {
    if (competitorLookCount >= 2) {
      recommendations.push({
        kind: "recommendation",
        title: "Save what you will do from that compare",
        body: "On SEO, save what you will do from how saved competitor websites compare to what you sell. GroovGro will not do that work, copy their words, or change the live website.",
        evidence: ["compete_moves.compare missing"],
        href: "/app/seo",
      });
    } else {
      recommendations.push({
        kind: "recommendation",
        title: "Save what you will do to compete",
        body: "On SEO, save what you will do after looking at a competitor site. GroovGro will not do that work or change the live website.",
        evidence: ["compete_moves missing"],
        href: "/app/seo",
      });
    }
  }

  if (facts.websiteConnected && competeMovePlannedCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Mark a compete move done when you finish it",
      body: "On SEO, mark a saved compete move as done after you do it. Moves still planned are listed first. GroovGro will not do that work or change the live website.",
      evidence: ["compete_moves.planned"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    competitorPageGapCount > competitorGapBriefCount
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Review pages competitors show that GroovGro has not read",
      body: "On SEO, read the topics competitor websites show that GroovGro has not read on your site. Topics that still need a brief are listed first. It will not copy their words, create a page, or search Google.",
      evidence: ["competitor_sites.page_gaps"],
      href: "/app/seo",
    });
    recommendations.push({
      kind: "recommendation",
      title: "Save a brief for a competitor page topic",
      body: "On SEO, save a planner brief for a topic a competitor site shows. Topics that still need a brief are listed first. GroovGro will not write the page, copy their words, or search Google.",
      evidence: ["content_briefs.competitor_gap"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    competitorLookCount === 1
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Read another competitor website to compare",
      body: "On SEO, read a second competitor website you named. GroovGro can then compare how they sell. It will not scrape Google or copy their words.",
      evidence: ["competitor_sites.compare"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    competitorSiteCount > 0 &&
    competitorLookCount === 0
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Read a competitor website you saved",
      body: "On SEO, read a competitor website you saved. GroovGro will write a stored look. It will not copy their words, buy ads, or search Google.",
      evidence: ["competitor_sites.looked_at missing"],
      href: "/app/seo",
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

  if (facts.websiteConnected && contentGapCount > contentGapBriefCount) {
    recommendations.push({
      kind: "recommendation",
      title: "Review queries with no matching page",
      body: "Open SEO to read which worth-a-look queries GroovGro could not find on pages it already read. You can save a brief from that list. Queries that still need a brief are listed first. GroovGro will not create a page.",
      evidence: ["content_gaps.status=gap"],
      href: "/app/seo",
    });
  }

  if (facts.websiteConnected && contentGapCount > contentGapBriefCount) {
    recommendations.push({
      kind: "recommendation",
      title: "Save a content brief to the planner",
      body: "On SEO, save a brief for a missing-page query from that list or the planner. Queries that still need a brief are listed first. GroovGro will not publish a page.",
      evidence: ["content_briefs missing"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    contentBriefCount > contentDraftCount
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Write a workspace draft from a brief",
      body: "On SEO, write a workspace draft from a saved brief. Briefs that still need a draft are listed first. If the brief is from a competitor topic, write it in this business’s words. GroovGro will not publish it, copy a competitor, or change the live website.",
      evidence: ["content_drafts missing"],
      href: "/app/seo",
    });
  }

  if (facts.websiteConnected && draftNoOfferToCheckCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Save what you sell so GroovGro can check that draft",
      body: "On Offers, save what you sell. GroovGro can then check a competitor-topic draft against that offer. It will not publish or change the live website.",
      evidence: ["content_drafts.no_offer_to_check"],
      href: "/app/offers",
    });
  }

  if (facts.websiteConnected && draftNoDifferenceToCheckCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Save what makes the business different so GroovGro can check that draft",
      body: "On Business, save what makes this business different. GroovGro can then check a competitor-topic draft against that. It will not publish or change the live website.",
      evidence: ["content_drafts.no_difference_to_check"],
      href: "/app/business",
    });
  }

  if (facts.websiteConnected && draftMissingDifferenceCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Write a competitor-topic draft so it names what makes you different",
      body: "On SEO, write that workspace draft again after you save what makes this business different. GroovGro will not publish or change the live website.",
      evidence: ["content_drafts.missing_difference"],
      href: "/app/seo",
    });
  }

  if (facts.websiteConnected && draftMissingOfferCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Write a competitor-topic draft so it names a saved offer",
      body: "On SEO, write that workspace draft again after you save what you sell. GroovGro will not publish or change the live website.",
      evidence: ["content_drafts.missing_offer"],
      href: "/app/seo",
    });
  }

  if (
    facts.websiteConnected &&
    contentDraftCount > cmsPublishRequestCount
  ) {
    recommendations.push({
      kind: "recommendation",
      title: "Save a draft for later CMS review",
      body: "On SEO, save a workspace draft for later review from the Content planner. Drafts that still need later review are listed first. GroovGro will not publish or change the live website.",
      evidence: ["cms_publish_requests missing"],
      href: "/app/seo",
    });
  }

  if (facts.websiteConnected && cmsPublishRequestCount > 0) {
    recommendations.push({
      kind: "recommendation",
      title: "Review a draft you saved for later",
      body: "On SEO, read a workspace draft you saved for later review. Waiting drafts are listed on Later review. GroovGro will not publish or change the live website.",
      evidence: ["cms_publish_requests.status=review"],
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

  if (facts.websiteConnected && comparable.length >= 2) {
    recommendations.push({
      kind: "recommendation",
      title: "Compare stored people, pages, content, and AI visibility",
      body: "Read the comparison of stored channels on Intelligence. GroovGro will not change today's Next step from this estimate, buy ads, or run work.",
      evidence: ["channel_scores.source=stored_workspace"],
      href: "/app/intelligence",
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
    `channel_compare=${
      facts.channelCompareCount ??
      channelsWithEvidence(
        scoreGrowthChannels(
          channelScoreFactsFromCounts({
            openLeadCount: facts.openLeadCount,
            proposedSeoActionCount: facts.proposedSeoActionCount,
            keywordReviewCount: facts.keywordReviewCount,
            contentGapCount: facts.contentGapCount,
            contentBriefCount: facts.contentBriefCount,
            contentDraftCount: facts.contentDraftCount,
            geoAuditGapCount: facts.geoAuditGapCount,
          }),
        ),
      ).length
    }`,
    `attribution_direct=${facts.attributionDirectCount ?? 0}`,
    `attribution_assisted=${facts.attributionAssistedCount ?? 0}`,
    `attribution_estimated=${facts.attributionEstimatedCount ?? 0}`,
    `attribution_unknown=${facts.attributionUnknownCount ?? 0}`,
    `before_after=${facts.beforeAfterLookCount ?? 0}`,
    `execution=${facts.executionRequestCount ?? 0}`,
    `competitor_sites=${facts.competitorSiteCount ?? 0}`,
    `competitor_looks=${facts.competitorLookCount ?? 0}`,
    `competitor_page_gaps=${facts.competitorPageGapCount ?? 0}`,
    `compete_moves=${facts.competeMoveCount ?? 0}`,
    `compete_moves_done=${facts.competeMoveDoneCount ?? 0}`,
    `compete_moves_planned=${
      facts.competeMovePlannedCount ??
      Math.max(0, (facts.competeMoveCount ?? 0) - (facts.competeMoveDoneCount ?? 0))
    }`,
    `competitor_gap_briefs=${facts.competitorGapBriefCount ?? 0}`,
    `content_gap_briefs=${facts.contentGapBriefCount ?? 0}`,
    `draft_offer_checks=${facts.draftOfferCheckCount ?? 0}`,
    `draft_missing_offers=${facts.draftMissingOfferCount ?? 0}`,
    `draft_no_offer_checks=${facts.draftNoOfferToCheckCount ?? 0}`,
    `draft_difference_checks=${facts.draftDifferenceCheckCount ?? 0}`,
    `draft_missing_differences=${facts.draftMissingDifferenceCount ?? 0}`,
    `draft_no_difference_checks=${facts.draftNoDifferenceToCheckCount ?? 0}`,
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
