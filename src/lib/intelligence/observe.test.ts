import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  briefToPlainText,
  buildIntelligenceBrief,
  factsSummary,
  type IntelligenceFacts,
} from "./observe";

function facts(overrides: Partial<IntelligenceFacts> = {}): IntelligenceFacts {
  return {
    websiteConnected: true,
    stripeConnected: true,
    openLeadCount: 0,
    customerCount: 0,
    contactCount: 0,
    paymentTotalCents: 0,
    chargeCountThisMonth: 0,
    unattributedRevenueCents: 0,
    upcomingEventCount: 0,
    sources: [],
    showFinancials: true,
    ...overrides,
  };
}

describe("intelligence observe", () => {
  it("tells the owner to follow up when leads are open", () => {
    const brief = buildIntelligenceBrief(
      facts({ openLeadCount: 3, contactCount: 3, customerCount: 1 }),
    );
    assert.match(brief.headline, /Leads are in the workspace/);
    assert.equal(
      brief.recommendations.some((item) => item.href === "/app/next-step"),
      true,
    );
    assert.equal(
      brief.recommendations.some((item) => /email them/i.test(item.body)),
      true,
    );
    const people = brief.observations.find((item) => item.title === "People in the workspace");
    assert.equal(people?.href, "/app/next-step");
  });

  it("does not invent revenue when financials are hidden", () => {
    const brief = buildIntelligenceBrief(
      facts({
        showFinancials: false,
        paymentTotalCents: 12_500,
        chargeCountThisMonth: 2,
        sources: [
          {
            source: "stripe",
            visits: 0,
            leads: 0,
            customers: 1,
            revenueCents: 12_500,
          },
        ],
      }),
    );
    const text = briefToPlainText(brief);
    assert.equal(text.includes("$125"), false);
    assert.equal(
      brief.observations.some((item) => item.title === "Payments this month"),
      false,
    );
  });

  it("points unattributed charges at Bookings, not at changing live checkout", () => {
    const brief = buildIntelligenceBrief(
      facts({
        chargeCountThisMonth: 1,
        paymentTotalCents: 40_000,
        unattributedRevenueCents: 40_000,
      }),
    );
    const match = brief.recommendations.find((item) =>
      item.title.includes("Match charges"),
    );
    assert.ok(match);
    assert.equal(match.href, "/app/commerce");
    assert.match(match.body, /Do not change the live checkout webhook/);
  });

  it("asks for UTM names when sources are only generic", () => {
    const brief = buildIntelligenceBrief(
      facts({
        sources: [
          {
            source: "direct",
            visits: 12,
            leads: 1,
            customers: 0,
            revenueCents: 0,
          },
        ],
      }),
    );
    const named = brief.recommendations.find((item) =>
      item.title.includes("Name the campaign"),
    );
    assert.ok(named);
    assert.equal(named.href, "/app/marketing");
    assert.match(named.body, /copy the link/);
    assert.match(named.body, /will not buy ads/);
    assert.doesNotMatch(named.body, /google ads/i);
  });

  it("still asks to name shared links when the only lead source is website_campaign", () => {
    const brief = buildIntelligenceBrief(
      facts({
        sources: [
          {
            source: "website_campaign",
            visits: 0,
            leads: 2,
            customers: 0,
            revenueCents: 0,
          },
        ],
      }),
    );
    assert.equal(
      brief.recommendations.some((item) => item.title.includes("Name the campaign")),
      true,
    );
  });

  it("never recommends sending email, ads, or replacing checkout", () => {
    const brief = buildIntelligenceBrief(
      facts({
        websiteConnected: false,
        stripeConnected: false,
        openLeadCount: 4,
      }),
    );
    const text = briefToPlainText(brief).toLowerCase();
    assert.equal(text.includes("send an email"), false);
    assert.equal(text.includes("google ads"), false);
    assert.match(text, /must not replace live checkout/);
    assert.equal(
      brief.recommendations.some((item) => item.href === "/app/next-step"),
      true,
    );
  });

  it("sends website and Stripe connect observations to Next step", () => {
    const brief = buildIntelligenceBrief(
      facts({ websiteConnected: false, stripeConnected: false }),
    );
    const website = brief.observations.find((item) => item.title === "Website not connected");
    const stripe = brief.observations.find(
      (item) => item.title === "Stripe is not marked connected",
    );
    assert.equal(website?.href, "/app/next-step");
    assert.equal(stripe?.href, "/app/next-step");
  });

  it("sends keep recording to Next step when the wait lives there", () => {
    const brief = buildIntelligenceBrief(
      facts({
        contactCount: 2,
        customerCount: 1,
        sources: [
          {
            source: "newsletter",
            visits: 4,
            leads: 1,
            customers: 0,
            revenueCents: 0,
          },
        ],
      }),
    );
    const keep = brief.recommendations.find(
      (item) => item.title === "Keep recording the journey",
    );
    assert.ok(keep);
    assert.equal(keep.href, "/app/next-step");
    assert.match(keep.body, /Open Next step/);
  });

  it("names the share next to the place for lead and revenue sources", () => {
    const leads = buildIntelligenceBrief(
      facts({
        sources: [
          {
            source: "instagram",
            campaign: "spring-open-house",
            visits: 4,
            leads: 3,
            customers: 0,
            revenueCents: 0,
          },
          {
            source: "instagram",
            campaign: "fall-sale",
            visits: 2,
            leads: 1,
            customers: 0,
            revenueCents: 0,
          },
        ],
      }),
    );
    const leadSource = leads.observations.find((item) => item.title === "Lead source");
    assert.match(leadSource?.body ?? "", /instagram · spring-open-house/);
    assert.doesNotMatch(leadSource?.body ?? "", /fall-sale/);

    const revenue = buildIntelligenceBrief(
      facts({
        chargeCountThisMonth: 2,
        paymentTotalCents: 15_000,
        sources: [
          {
            source: "instagram",
            campaign: "spring-open-house",
            visits: 0,
            leads: 1,
            customers: 1,
            revenueCents: 10_000,
          },
          {
            source: "instagram",
            campaign: "fall-sale",
            visits: 0,
            leads: 1,
            customers: 1,
            revenueCents: 5_000,
          },
        ],
      }),
    );
    const revenueSource = revenue.observations.find(
      (item) => item.title === "Revenue source",
    );
    assert.match(revenueSource?.body ?? "", /instagram · spring-open-house/);
  });

  it("names the share that moved the active Goal", () => {
    const brief = buildIntelligenceBrief(
      facts({
        activeGoalShare: {
          title: "More people get in touch",
          note: "This Goal number is from instagram · spring-open-house.",
        },
      }),
    );
    const goalShare = brief.observations.find(
      (item) => item.title === "Goal number and share",
    );
    assert.match(goalShare?.body ?? "", /instagram · spring-open-house/);
    assert.equal(goalShare?.href, "/app/next-step");
    assert.match(goalShare?.body ?? "", /Marketing/);
  });

  it("shows a proposed SEO action as observed evidence, not an executed change", () => {
    const brief = buildIntelligenceBrief(
      facts({
        proposedSeoActionCount: 1,
        proposedSeoSummary:
          "Search Console shows that “ASA sailing lessons” received 1,240 impressions and an average position of 11.3.",
      }),
    );
    const observed = brief.observations.find(
      (item) => item.title === "Search and website opportunity",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/next-step");
    assert.match(observed.body, /1,240 impressions/);
    assert.match(observed.body, /will not change the live website/);
    const recommended = brief.recommendations.find(
      (item) => item.title === "Review the SEO opportunity",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/next-step");
    assert.match(recommended.body, /Approving does not change the live website/);
    assert.equal(
      brief.recommendations.some((item) => /Keep recording/.test(item.title)),
      false,
    );
  });

  it("observes recorded Search Console queries and ranks them as estimates", () => {
    const brief = buildIntelligenceBrief(
      facts({
        recordedKeywordCount: 3,
        keywordReviewCount: 1,
      }),
    );
    const observed = brief.observations.find(
      (item) => item.title === "Search queries from Search Console",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /3 search queries/);
    assert.match(observed.body, /worth a look/);
    assert.match(observed.body, /not search volume or a traffic forecast/);
    const recommended = brief.recommendations.find(
      (item) => item.title === "Review the ranked search queries",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not change the live website/);
    assert.equal(
      buildIntelligenceBrief(facts({ recordedKeywordCount: 3 })).recommendations.some(
        (item) => item.title === "Review the ranked search queries",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(facts()).observations.some(
        (item) => item.title === "Search queries from Search Console",
      ),
      false,
    );
  });

  it("observes owner-saved competitor notes and does not scrape search results", () => {
    const saved = buildIntelligenceBrief(
      facts({
        recordedKeywordCount: 3,
        knownCompetitorCount: 2,
        serpNoteCount: 1,
      }),
    );
    const observed = saved.observations.find(
      (item) => item.title === "Competitor notes you already saved",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /1 competitor note/);
    assert.match(observed.body, /did not look these businesses up/);
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Save a competitor you already see",
      ),
      false,
    );

    const missing = buildIntelligenceBrief(
      facts({
        recordedKeywordCount: 3,
        knownCompetitorCount: 2,
        serpNoteCount: 0,
      }),
    );
    const recommended = missing.recommendations.find(
      (item) => item.title === "Save a competitor you already see",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not look anyone up/);
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Save a competitor you already see",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          recordedKeywordCount: 3,
          knownCompetitorCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a competitor you already see",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          recordedKeywordCount: 0,
          knownCompetitorCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a competitor you already see",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          recordedKeywordCount: 3,
          knownCompetitorCount: 0,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a competitor you already see",
      ),
      false,
    );
  });

  it("observes owner-saved AI visibility notes and does not scrape answers", () => {
    const saved = buildIntelligenceBrief(
      facts({
        recordedKeywordCount: 3,
        geoNoteCount: 1,
      }),
    );
    const observed = saved.observations.find(
      (item) => item.title === "AI visibility notes you already saved",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /1 AI visibility note/);
    assert.match(observed.body, /did not ask an AI system/);
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Save what you already hear from AI",
      ),
      false,
    );

    const missing = buildIntelligenceBrief(
      facts({
        recordedKeywordCount: 3,
        geoNoteCount: 0,
      }),
    );
    const recommended = missing.recommendations.find(
      (item) => item.title === "Save what you already hear from AI",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not ask an AI system/);
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Save what you already hear from AI",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          recordedKeywordCount: 3,
        }),
      ).recommendations.some(
        (item) => item.title === "Save what you already hear from AI",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          recordedKeywordCount: 0,
        }),
      ).recommendations.some(
        (item) => item.title === "Save what you already hear from AI",
      ),
      false,
    );
  });

  it("observes saved AI visibility questions and does not ask an AI system", () => {
    const saved = buildIntelligenceBrief(
      facts({
        recordedKeywordCount: 3,
        geoQueryCount: 2,
      }),
    );
    const observed = saved.observations.find(
      (item) => item.title === "Questions saved for later AI visibility",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /2 questions/);
    assert.match(observed.body, /did not ask an AI system/);
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Save a question to remember for later AI visibility",
      ),
      false,
    );

    const missing = buildIntelligenceBrief(
      facts({
        recordedKeywordCount: 3,
        geoQueryCount: 0,
      }),
    );
    const recommended = missing.recommendations.find(
      (item) => item.title === "Save a question to remember for later AI visibility",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not ask an AI system/);
    assert.equal(
      buildIntelligenceBrief(
        facts({ geoNoteCount: 1, geoQueryCount: 0 }),
      ).recommendations.some(
        (item) => item.title === "Save a question to remember for later AI visibility",
      ),
      true,
    );
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Save a question to remember for later AI visibility",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          recordedKeywordCount: 3,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a question to remember for later AI visibility",
      ),
      false,
    );
  });

  it("observes owner-saved AI visibility history and does not ask an AI system", () => {
    const saved = buildIntelligenceBrief(
      facts({
        geoQueryCount: 1,
        geoHistoryCount: 2,
      }),
    );
    const observed = saved.observations.find(
      (item) => item.title === "AI visibility history you already saved",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /2 visibility snapshots/);
    assert.match(observed.body, /did not ask an AI system/);
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Save visibility history from what you already heard",
      ),
      false,
    );

    const missing = buildIntelligenceBrief(
      facts({
        geoQueryCount: 1,
        geoHistoryCount: 0,
      }),
    );
    const recommended = missing.recommendations.find(
      (item) => item.title === "Save visibility history from what you already heard",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not ask an AI system/);
    assert.match(recommended.body, /treat one answer as truth/);
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Save visibility history from what you already heard",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          geoQueryCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Save visibility history from what you already heard",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          geoQueryCount: 0,
          geoHistoryCount: 0,
        }),
      ).recommendations.some(
        (item) => item.title === "Save visibility history from what you already heard",
      ),
      false,
    );
    assert.match(factsSummary(facts({ geoHistoryCount: 3 })), /geo_history=3/);
  });

  it("observes citation gaps from saved history and does not ask an AI system", () => {
    const brief = buildIntelligenceBrief(
      facts({
        geoHistoryCount: 2,
        geoAuditGapCount: 1,
      }),
    );
    const observed = brief.observations.find(
      (item) => item.title === "Citation gaps from saved visibility history",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /1 library question has/);
    assert.match(observed.body, /did not ask an AI system/);
    const recommended = brief.recommendations.find(
      (item) => item.title === "Review citation gaps from saved history",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not ask an AI system/);
    assert.match(recommended.body, /treat one answer as truth/);
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Review citation gaps from saved history",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          geoHistoryCount: 2,
          geoAuditGapCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Review citation gaps from saved history",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          geoHistoryCount: 0,
          geoAuditGapCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Review citation gaps from saved history",
      ),
      false,
    );
    assert.match(factsSummary(facts({ geoAuditGapCount: 4 })), /geo_audits=4/);
  });

  it("compares stored channels and does not change Next step", () => {
    const brief = buildIntelligenceBrief(
      facts({
        openLeadCount: 4,
        contentGapCount: 3,
        geoAuditGapCount: 1,
      }),
    );
    const observed = brief.observations.find(
      (item) => item.title === "What stored evidence says to compare",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/intelligence");
    assert.match(observed.body, /3 stored channels look stronger/);
    assert.match(observed.body, /did not change Next step/);
    assert.match(observed.body, /buy ads/);
    const recommended = brief.recommendations.find(
      (item) =>
        item.title === "Compare stored people, pages, content, and AI visibility",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/intelligence");
    assert.match(recommended.body, /will not change today's Next step/);
    assert.match(recommended.body, /buy ads, or run work/);
    assert.equal(
      buildIntelligenceBrief(facts()).observations.some(
        (item) => item.title === "What stored evidence says to compare",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(facts({ openLeadCount: 4 })).recommendations.some(
        (item) =>
          item.title ===
          "Compare stored people, pages, content, and AI visibility",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          openLeadCount: 4,
          contentGapCount: 3,
        }),
      ).recommendations.some(
        (item) =>
          item.title ===
          "Compare stored people, pages, content, and AI visibility",
      ),
      false,
    );
    assert.match(
      factsSummary(facts({ openLeadCount: 4, contentGapCount: 3 })),
      /channel_compare=2/,
    );
  });

  it("labels stored attribution joins and does not invent a keyword path", () => {
    const brief = buildIntelligenceBrief(
      facts({
        attributionDirectCount: 2,
        attributionAssistedCount: 1,
        attributionEstimatedCount: 1,
        attributionUnknownCount: 3,
      }),
    );
    const observed = brief.observations.find(
      (item) => item.title === "How sure GroovGro is about stored joins",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/marketing");
    assert.match(observed.body, /7 stored joins/);
    assert.match(observed.body, /2 DIRECT/);
    assert.match(observed.body, /did not invent a keyword, AI-referral, or ad-click path/);
    const recommended = brief.recommendations.find(
      (item) => item.title === "Read how sure GroovGro is about stored joins",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/marketing");
    assert.match(recommended.body, /will not buy ads/);
    assert.match(recommended.body, /keyword or AI-referral path/);
    assert.equal(
      brief.recommendations.find((item) => item.title.includes("Match charges"))
        ?.href,
      undefined,
    );
    assert.equal(
      buildIntelligenceBrief(facts()).observations.some(
        (item) => item.title === "How sure GroovGro is about stored joins",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          attributionDirectCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Read how sure GroovGro is about stored joins",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({ attributionUnknownCount: 4 }),
      ).recommendations.some(
        (item) => item.title === "Read how sure GroovGro is about stored joins",
      ),
      false,
    );
    assert.match(
      factsSummary(facts({ attributionDirectCount: 2, attributionUnknownCount: 1 })),
      /attribution_direct=2/,
    );
  });

  it("observes a stored before and after and does not run an experiment", () => {
    const brief = buildIntelligenceBrief(
      facts({
        beforeAfterLookCount: 2,
      }),
    );
    const observed = brief.observations.find(
      (item) => item.title === "What a stored before and after shows",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/next-step");
    assert.match(observed.body, /2 Goals have/);
    assert.match(observed.body, /did not run an experiment/);
    const recommended = brief.recommendations.find(
      (item) => item.title === "Read the stored before and after",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/next-step");
    assert.match(recommended.body, /not an experiment GroovGro ran/);
    assert.match(recommended.body, /will not buy ads/);
    assert.equal(
      buildIntelligenceBrief(facts()).observations.some(
        (item) => item.title === "What a stored before and after shows",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          beforeAfterLookCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Read the stored before and after",
      ),
      false,
    );
    assert.match(factsSummary(facts({ beforeAfterLookCount: 3 })), /before_after=3/);
  });

  it("observes approved work saved for later and does not run it", () => {
    const brief = buildIntelligenceBrief(
      facts({
        executionRequestCount: 2,
      }),
    );
    const observed = brief.observations.find(
      (item) => item.title === "Approved work saved for later",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/next-step");
    assert.match(observed.body, /2 pieces/);
    assert.match(observed.body, /did not run them/);
    const recommended = brief.recommendations.find(
      (item) => item.title === "Read the later-run queue",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/next-step");
    assert.match(recommended.body, /will not run it/);
    assert.match(recommended.body, /will not run it, buy ads/);
    assert.equal(
      buildIntelligenceBrief(facts()).observations.some(
        (item) => item.title === "Approved work saved for later",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          executionRequestCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Read the later-run queue",
      ),
      false,
    );
    assert.match(factsSummary(facts({ executionRequestCount: 3 })), /execution=3/);
  });

  it("observes owner-named competitor websites and does not scrape Google", () => {
    const saved = buildIntelligenceBrief(
      facts({
        competitorSiteCount: 2,
        competitorLookCount: 2,
      }),
    );
    const observed = saved.observations.find(
      (item) => item.title === "Competitor websites you asked GroovGro to read",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /2 competitor websites are saved/);
    assert.match(observed.body, /GroovGro read 2/);
    assert.match(observed.body, /did not scrape Google/);
    assert.match(observed.body, /compare to what you sell/);
    const compared = saved.observations.find(
      (item) => item.title === "How saved competitor websites compare",
    );
    assert.ok(compared);
    assert.equal(compared.href, "/app/seo");
    assert.match(compared.body, /2 competitor websites you named/);
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Save a competitor website you already know",
      ),
      false,
    );
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Read another competitor website to compare",
      ),
      false,
    );
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Read a competitor website you saved",
      ),
      false,
    );

    const unread = buildIntelligenceBrief(
      facts({
        competitorSiteCount: 1,
        competitorLookCount: 0,
      }),
    );
    const readIt = unread.recommendations.find(
      (item) => item.title === "Read a competitor website you saved",
    );
    assert.ok(readIt);
    assert.equal(readIt.href, "/app/seo");
    assert.match(readIt.body, /will not copy their words/);
    assert.equal(
      unread.recommendations.some(
        (item) => item.title === "Read another competitor website to compare",
      ),
      false,
    );

    const oneLook = buildIntelligenceBrief(
      facts({
        competitorSiteCount: 1,
        competitorLookCount: 1,
      }),
    );
    const compareNext = oneLook.recommendations.find(
      (item) => item.title === "Read another competitor website to compare",
    );
    assert.ok(compareNext);
    assert.equal(compareNext.href, "/app/seo");
    assert.match(compareNext.body, /will not scrape Google/);

    const missing = buildIntelligenceBrief(
      facts({
        knownCompetitorCount: 2,
      }),
    );
    const recommended = missing.recommendations.find(
      (item) => item.title === "Save a competitor website you already know",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not scrape Google/);
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Save a competitor website you already know",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          knownCompetitorCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a competitor website you already know",
      ),
      false,
    );
    assert.match(
      factsSummary(facts({ competitorSiteCount: 3, competitorLookCount: 2, competitorPageGapCount: 4 })),
      /competitor_sites=3 competitor_looks=2 competitor_page_gaps=4/,
    );

    const pageGaps = buildIntelligenceBrief(
      facts({
        competitorLookCount: 1,
        competitorPageGapCount: 2,
      }),
    );
    const gapObserved = pageGaps.observations.find(
      (item) => item.title === "Competitor page topics GroovGro has not read on your site",
    );
    assert.ok(gapObserved);
    assert.equal(gapObserved.href, "/app/seo");
    assert.match(gapObserved.body, /2 topics/);
    assert.match(gapObserved.body, /not a reason to copy their words or create a page/);
    assert.match(
      buildIntelligenceBrief(
        facts({
          competitorPageGapCount: 2,
          competitorGapBriefCount: 1,
        }),
      ).observations.find(
        (item) =>
          item.title ===
          "Competitor page topics GroovGro has not read on your site",
      )?.body ?? "",
      /1 still has no brief on the planner/,
    );
    assert.match(
      buildIntelligenceBrief(
        facts({
          competitorPageGapCount: 2,
          competitorGapBriefCount: 2,
        }),
      ).observations.find(
        (item) =>
          item.title ===
          "Competitor page topics GroovGro has not read on your site",
      )?.body ?? "",
      /All of those already have a brief on the planner/,
    );
    const reviewGaps = pageGaps.recommendations.find(
      (item) => item.title === "Review pages competitors show that GroovGro has not read",
    );
    assert.ok(reviewGaps);
    assert.equal(reviewGaps.href, "/app/seo");
    assert.match(reviewGaps.body, /will not copy their words/);
    const saveBrief = pageGaps.recommendations.find(
      (item) => item.title === "Save a brief for a competitor page topic",
    );
    assert.ok(saveBrief);
    assert.equal(saveBrief.href, "/app/seo");
    assert.match(saveBrief.body, /will not write the page/);
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          competitorPageGapCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Review pages competitors show that GroovGro has not read",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          competitorPageGapCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a brief for a competitor page topic",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          competitorPageGapCount: 2,
          competitorGapBriefCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a brief for a competitor page topic",
      ),
      false,
    );
    assert.ok(
      buildIntelligenceBrief(
        facts({
          competitorPageGapCount: 2,
          competitorGapBriefCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a brief for a competitor page topic",
      ),
    );

    const findMore = buildIntelligenceBrief(
      facts({
        recordedKeywordCount: 3,
        competitorSiteCount: 0,
      }),
    );
    const runSearch = findMore.recommendations.find(
      (item) => item.title === "Run a search to find another competitor",
    );
    assert.ok(runSearch);
    assert.equal(runSearch.href, "/app/seo");
    assert.match(runSearch.body, /will not search Google/);
    assert.equal(
      buildIntelligenceBrief(
        facts({
          recordedKeywordCount: 3,
          competitorSiteCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Run a search to find another competitor",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          recordedKeywordCount: 3,
        }),
      ).recommendations.some(
        (item) => item.title === "Run a search to find another competitor",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Run a search to find another competitor",
      ),
      false,
    );
  });

  it("observes owner-saved compete moves and does not do the work", () => {
    const saved = buildIntelligenceBrief(
      facts({
        competeMoveCount: 2,
      }),
    );
    const observed = saved.observations.find(
      (item) => item.title === "Compete moves you said you will do",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /2 moves/);
    assert.match(observed.body, /did not do that work/);
    const done = buildIntelligenceBrief(
      facts({
        competeMoveCount: 2,
        competeMoveDoneCount: 1,
      }),
    );
    assert.match(
      done.observations.find(
        (item) => item.title === "Compete moves you said you will do",
      )?.body ?? "",
      /1 is marked done/,
    );
    assert.match(
      done.observations.find(
        (item) => item.title === "Compete moves you said you will do",
      )?.body ?? "",
      /1 is still planned/,
    );
    assert.match(
      factsSummary(facts({ competeMoveCount: 3, competeMoveDoneCount: 1 })),
      /compete_moves=3 compete_moves_done=1 compete_moves_planned=2/,
    );
    assert.match(
      buildIntelligenceBrief(
        facts({
          competeMoveCount: 2,
          competeMoveDoneCount: 2,
          competeMovePlannedCount: 0,
        }),
      ).observations.find(
        (item) => item.title === "Compete moves you said you will do",
      )?.body ?? "",
      /None are still planned/,
    );
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Save what you will do to compete",
      ),
      false,
    );

    const missing = buildIntelligenceBrief(
      facts({
        competitorLookCount: 1,
        competeMoveCount: 0,
      }),
    );
    const recommended = missing.recommendations.find(
      (item) => item.title === "Save what you will do to compete",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not do that work/);
    const fromCompare = buildIntelligenceBrief(
      facts({
        competitorLookCount: 2,
        competeMoveCount: 0,
      }),
    );
    const compareRec = fromCompare.recommendations.find(
      (item) => item.title === "Save what you will do from that compare",
    );
    assert.ok(compareRec);
    assert.equal(compareRec.href, "/app/seo");
    assert.match(compareRec.body, /will not do that work/);
    assert.equal(
      fromCompare.recommendations.some(
        (item) => item.title === "Save what you will do to compete",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          competitorLookCount: 2,
          competeMoveCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Save what you will do from that compare",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Save what you will do to compete",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          competitorLookCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Save what you will do to compete",
      ),
      false,
    );
    assert.match(factsSummary(facts({ competeMoveCount: 3 })), /compete_moves=3/);
    const markDone = buildIntelligenceBrief(
      facts({
        competeMoveCount: 2,
        competeMoveDoneCount: 1,
        competeMovePlannedCount: 1,
      }),
    ).recommendations.find(
      (item) => item.title === "Mark a compete move done when you finish it",
    );
    assert.ok(markDone);
    assert.equal(markDone.href, "/app/seo");
    assert.match(markDone.body, /will not do that work/);
    assert.equal(
      buildIntelligenceBrief(
        facts({
          competeMoveCount: 2,
          competeMoveDoneCount: 2,
          competeMovePlannedCount: 0,
        }),
      ).recommendations.some(
        (item) => item.title === "Mark a compete move done when you finish it",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          competeMoveCount: 1,
          competeMovePlannedCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Mark a compete move done when you finish it",
      ),
      false,
    );
  });

  it("observes stored content gaps and does not write a page", () => {
    const brief = buildIntelligenceBrief(
      facts({
        contentGapCount: 2,
      }),
    );
    const observed = brief.observations.find(
      (item) => item.title === "Search queries with no matching page GroovGro has read",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /2 worth-a-look queries/);
    assert.match(observed.body, /did not invent topics/);
    assert.match(
      buildIntelligenceBrief(
        facts({
          contentGapCount: 2,
          contentGapBriefCount: 1,
        }),
      ).observations.find(
        (item) =>
          item.title ===
          "Search queries with no matching page GroovGro has read",
      )?.body ?? "",
      /1 still has no brief on the planner/,
    );
    assert.match(
      buildIntelligenceBrief(
        facts({
          contentGapCount: 2,
          contentGapBriefCount: 2,
        }),
      ).observations.find(
        (item) =>
          item.title ===
          "Search queries with no matching page GroovGro has read",
      )?.body ?? "",
      /All of those already have a brief on the planner/,
    );
    const recommended = brief.recommendations.find(
      (item) => item.title === "Review queries with no matching page",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not create a page/);
    assert.match(recommended.body, /save a brief from that list/);
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Review queries with no matching page",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({ websiteConnected: false, contentGapCount: 2 }),
      ).recommendations.some(
        (item) => item.title === "Review queries with no matching page",
      ),
      false,
    );
  });

  it("observes saved content briefs and does not write a page", () => {
    const saved = buildIntelligenceBrief(
      facts({
        contentGapCount: 1,
        contentBriefCount: 2,
      }),
    );
    const observed = saved.observations.find(
      (item) => item.title === "Content briefs on the planner",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /2 content briefs/);
    assert.match(observed.body, /did not publish a page/);
    assert.match(
      buildIntelligenceBrief(
        facts({
          contentBriefCount: 2,
          competitorGapBriefCount: 1,
        }),
      ).observations.find((item) => item.title === "Content briefs on the planner")
        ?.body ?? "",
      /1 is from a competitor page topic/,
    );
    assert.match(
      factsSummary(facts({ competitorGapBriefCount: 1 })),
      /competitor_gap_briefs=1/,
    );
    assert.match(
      buildIntelligenceBrief(
        facts({
          contentBriefCount: 2,
          contentGapBriefCount: 1,
        }),
      ).observations.find((item) => item.title === "Content briefs on the planner")
        ?.body ?? "",
      /1 is from a missing-page query/,
    );
    assert.match(
      factsSummary(facts({ contentGapBriefCount: 1 })),
      /content_gap_briefs=1/,
    );
    assert.match(
      buildIntelligenceBrief(
        facts({
          contentBriefCount: 2,
          contentDraftCount: 1,
        }),
      ).observations.find((item) => item.title === "Content briefs on the planner")
        ?.body ?? "",
      /1 still needs a workspace draft/,
    );
    assert.match(
      buildIntelligenceBrief(
        facts({
          contentBriefCount: 2,
          contentDraftCount: 2,
        }),
      ).observations.find((item) => item.title === "Content briefs on the planner")
        ?.body ?? "",
      /All of those already have a workspace draft/,
    );
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Save a content brief to the planner",
      ),
      true,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          contentGapCount: 1,
          contentBriefCount: 1,
          competitorGapBriefCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a content brief to the planner",
      ),
      true,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          contentGapCount: 1,
          contentBriefCount: 1,
          contentGapBriefCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a content brief to the planner",
      ),
      false,
    );

    const missing = buildIntelligenceBrief(
      facts({
        contentGapCount: 1,
        contentBriefCount: 0,
      }),
    );
    const recommended = missing.recommendations.find(
      (item) => item.title === "Save a content brief to the planner",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not publish a page/);
    assert.match(recommended.body, /from that list or the planner/);
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Save a content brief to the planner",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          contentGapCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a content brief to the planner",
      ),
      false,
    );
  });

  it("observes workspace content drafts and does not publish", () => {
    const saved = buildIntelligenceBrief(
      facts({
        contentBriefCount: 1,
        contentDraftCount: 2,
      }),
    );
    const observed = saved.observations.find(
      (item) => item.title === "Workspace content drafts",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /2 workspace drafts/);
    assert.match(observed.body, /did not publish/);
    assert.match(
      buildIntelligenceBrief(
        facts({
          contentDraftCount: 2,
          cmsPublishRequestCount: 1,
        }),
      ).observations.find((item) => item.title === "Workspace content drafts")
        ?.body ?? "",
      /1 is still not saved for later review/,
    );
    assert.match(
      buildIntelligenceBrief(
        facts({
          contentDraftCount: 2,
          cmsPublishRequestCount: 2,
        }),
      ).observations.find((item) => item.title === "Workspace content drafts")
        ?.body ?? "",
      /All of those are already saved for later review/,
    );
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Write a workspace draft from a brief",
      ),
      false,
    );

    const missing = buildIntelligenceBrief(
      facts({
        contentBriefCount: 1,
        contentDraftCount: 0,
      }),
    );
    const recommended = missing.recommendations.find(
      (item) => item.title === "Write a workspace draft from a brief",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not publish/);
    assert.match(recommended.body, /copy a competitor/);
    assert.ok(
      buildIntelligenceBrief(
        facts({
          contentBriefCount: 2,
          contentDraftCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Write a workspace draft from a brief",
      ),
    );
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Write a workspace draft from a brief",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          contentBriefCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Write a workspace draft from a brief",
      ),
      false,
    );
  });

  it("observes drafts saved for later CMS review and does not publish", () => {
    const saved = buildIntelligenceBrief(
      facts({
        contentDraftCount: 1,
        cmsPublishRequestCount: 2,
      }),
    );
    const observed = saved.observations.find(
      (item) => item.title === "Drafts saved for later CMS review",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /2 drafts/);
    assert.match(observed.body, /did not publish/);
    const reviewQueued = saved.recommendations.find(
      (item) => item.title === "Review a draft you saved for later",
    );
    assert.ok(reviewQueued);
    assert.equal(reviewQueued.href, "/app/seo");
    assert.match(reviewQueued.body, /will not publish/);
    assert.equal(
      saved.recommendations.some(
        (item) => item.title === "Save a draft for later CMS review",
      ),
      false,
    );
    const stillOpen = buildIntelligenceBrief(
      facts({
        contentDraftCount: 2,
        cmsPublishRequestCount: 1,
      }),
    );
    assert.ok(
      stillOpen.recommendations.some(
        (item) => item.title === "Save a draft for later CMS review",
      ),
    );

    const missing = buildIntelligenceBrief(
      facts({
        contentDraftCount: 1,
        cmsPublishRequestCount: 0,
      }),
    );
    const recommended = missing.recommendations.find(
      (item) => item.title === "Save a draft for later CMS review",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not publish/);
    assert.match(recommended.body, /Content planner/);
    assert.equal(
      missing.recommendations.some(
        (item) => item.title === "Review a draft you saved for later",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Save a draft for later CMS review",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          cmsPublishRequestCount: 2,
        }),
      ).recommendations.some(
        (item) => item.title === "Review a draft you saved for later",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          contentDraftCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Save a draft for later CMS review",
      ),
      false,
    );
    assert.match(factsSummary(facts({ cmsPublishRequestCount: 3 })), /cms_publish=3/);
  });

  it("observes competitor-topic draft offer checks and does not publish", () => {
    const named = buildIntelligenceBrief(
      facts({
        draftOfferCheckCount: 2,
        draftMissingOfferCount: 0,
        draftNoOfferToCheckCount: 0,
      }),
    );
    const observed = named.observations.find(
      (item) =>
        item.title === "Competitor-topic drafts checked against what you sell",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /2 competitor-topic drafts/);
    assert.match(observed.body, /2 name a saved offer/);
    assert.match(observed.body, /did not publish/);
    assert.equal(
      named.recommendations.some(
        (item) =>
          item.title === "Write a competitor-topic draft so it names a saved offer",
      ),
      false,
    );

    const missing = buildIntelligenceBrief(
      facts({
        draftOfferCheckCount: 1,
        draftMissingOfferCount: 1,
      }),
    );
    const rewrite = missing.recommendations.find(
      (item) =>
        item.title === "Write a competitor-topic draft so it names a saved offer",
    );
    assert.ok(rewrite);
    assert.equal(rewrite.href, "/app/seo");
    assert.match(rewrite.body, /will not publish/);
    const missingNote = missing.observations.find(
      (item) =>
        item.title === "Competitor-topic drafts checked against what you sell",
    );
    assert.ok(missingNote);
    assert.match(missingNote.body, /does not name a saved offer/);

    const none = buildIntelligenceBrief(
      facts({
        draftOfferCheckCount: 1,
        draftNoOfferToCheckCount: 1,
      }),
    );
    const saveOffer = none.recommendations.find(
      (item) =>
        item.title === "Save what you sell so GroovGro can check that draft",
    );
    assert.ok(saveOffer);
    assert.equal(saveOffer.href, "/app/offers");
    assert.match(saveOffer.body, /will not publish/);
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) =>
          item.title === "Save what you sell so GroovGro can check that draft",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          draftOfferCheckCount: 1,
          draftMissingOfferCount: 1,
        }),
      ).recommendations.some(
        (item) =>
          item.title === "Write a competitor-topic draft so it names a saved offer",
      ),
      false,
    );
    assert.match(
      factsSummary(
        facts({
          draftOfferCheckCount: 2,
          draftMissingOfferCount: 1,
          draftNoOfferToCheckCount: 1,
        }),
      ),
      /draft_offer_checks=2 draft_missing_offers=1 draft_no_offer_checks=1/,
    );
  });

  it("observes competitor-topic draft difference checks and does not publish", () => {
    const named = buildIntelligenceBrief(
      facts({
        draftDifferenceCheckCount: 2,
        draftMissingDifferenceCount: 0,
        draftNoDifferenceToCheckCount: 0,
      }),
    );
    const observed = named.observations.find(
      (item) =>
        item.title ===
        "Competitor-topic drafts checked against what makes you different",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/seo");
    assert.match(observed.body, /2 competitor-topic drafts/);
    assert.match(observed.body, /2 name that difference/);
    assert.match(observed.body, /did not publish/);

    const missing = buildIntelligenceBrief(
      facts({
        draftDifferenceCheckCount: 1,
        draftMissingDifferenceCount: 1,
      }),
    );
    const rewrite = missing.recommendations.find(
      (item) =>
        item.title ===
        "Write a competitor-topic draft so it names what makes you different",
    );
    assert.ok(rewrite);
    assert.equal(rewrite.href, "/app/seo");
    assert.match(rewrite.body, /will not publish/);

    const none = buildIntelligenceBrief(
      facts({
        draftDifferenceCheckCount: 1,
        draftNoDifferenceToCheckCount: 1,
      }),
    );
    const saveDiff = none.recommendations.find(
      (item) =>
        item.title ===
        "Save what makes the business different so GroovGro can check that draft",
    );
    assert.ok(saveDiff);
    assert.equal(saveDiff.href, "/app/business");
    assert.match(
      factsSummary(facts({ draftDifferenceCheckCount: 2, draftMissingDifferenceCount: 1 })),
      /draft_difference_checks=2 draft_missing_differences=1/,
    );
  });

  it("observes link and schema facts and does not write the live site", () => {
    const withLinks = buildIntelligenceBrief(
      facts({
        internalLinkCount: 2,
        schemaFactCount: 3,
        schemaReviewCount: 1,
      }),
    );
    const linkNote = withLinks.observations.find(
      (item) => item.title === "Internal link suggestions from pages already read",
    );
    assert.ok(linkNote);
    assert.equal(linkNote.href, "/app/seo");
    assert.match(linkNote.body, /2 stored pages mention/);
    assert.match(linkNote.body, /did not add a link/);
    const schemaNote = withLinks.observations.find(
      (item) => item.title === "Estimated schema types from pages already read",
    );
    assert.ok(schemaNote);
    assert.equal(schemaNote.href, "/app/seo");
    assert.match(schemaNote.body, /3 pages/);
    assert.match(schemaNote.body, /did not add schema/);
    const recommended = withLinks.recommendations.find(
      (item) => item.title === "Review link and schema facts from pages already read",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/seo");
    assert.match(recommended.body, /will not add links or schema/);
    assert.equal(
      withLinks.recommendations.some((item) => /add schema/i.test(item.title)),
      false,
    );

    assert.equal(
      buildIntelligenceBrief(
        facts({ schemaFactCount: 4, schemaReviewCount: 0 }),
      ).recommendations.some(
        (item) => item.title === "Review link and schema facts from pages already read",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Review link and schema facts from pages already read",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          internalLinkCount: 2,
          schemaReviewCount: 1,
        }),
      ).recommendations.some(
        (item) => item.title === "Review link and schema facts from pages already read",
      ),
      false,
    );
  });

  it("observes saved business context and does not look up competitors", () => {
    const saved = buildIntelligenceBrief(
      facts({
        businessBrainSaved: true,
        businessContextSaved: true,
      }),
    );
    const observed = saved.observations.find(
      (item) => item.title === "Business context for later search work",
    );
    assert.ok(observed);
    assert.equal(observed.href, "/app/business");
    assert.match(observed.body, /This form still does not look up competitors/);

    const missing = buildIntelligenceBrief(
      facts({
        businessBrainSaved: true,
        businessContextSaved: false,
      }),
    );
    const recommended = missing.recommendations.find(
      (item) => item.title === "Add business context for later search work",
    );
    assert.ok(recommended);
    assert.equal(recommended.href, "/app/business");
    assert.match(recommended.body, /This form still does not look up competitors/);
    assert.equal(
      buildIntelligenceBrief(facts()).recommendations.some(
        (item) => item.title === "Add business context for later search work",
      ),
      false,
    );
    assert.equal(
      buildIntelligenceBrief(
        facts({
          websiteConnected: false,
          businessBrainSaved: true,
          businessContextSaved: false,
        }),
      ).recommendations.some(
        (item) => item.title === "Add business context for later search work",
      ),
      false,
    );
  });

  it("names extra shares that also moved the active Goal", () => {
    const brief = buildIntelligenceBrief(
      facts({
        activeGoalShare: {
          title: "More people get in touch",
          note: "2 of 3 in this Goal number came from instagram · spring-open-house.",
          rows: [
            { origin: "instagram · spring-open-house", count: 2 },
            { origin: "instagram · summer-open-house", count: 1 },
          ],
        },
      }),
    );
    const goalShare = brief.observations.find(
      (item) => item.title === "Goal number and share",
    );
    assert.match(goalShare?.body ?? "", /instagram · spring-open-house/);
    assert.match(goalShare?.body ?? "", /Other named shares: instagram · summer-open-house \(1\)/);
  });

  it("sends people observations to Next step when follow-up or adding a person lives there", () => {
    const empty = buildIntelligenceBrief(facts({ contactCount: 0, openLeadCount: 0 }));
    const peopleEmpty = empty.observations.find(
      (item) => item.title === "People in the workspace",
    );
    assert.equal(peopleEmpty?.href, "/app/next-step");

    const browsing = buildIntelligenceBrief(
      facts({ contactCount: 4, customerCount: 2, openLeadCount: 0 }),
    );
    const peopleBrowse = browsing.observations.find(
      (item) => item.title === "People in the workspace",
    );
    assert.equal(peopleBrowse?.href, "/app/crm");
  });
});
