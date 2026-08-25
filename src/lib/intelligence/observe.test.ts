import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  briefToPlainText,
  buildIntelligenceBrief,
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
    assert.match(goalShare?.body ?? "", /instagram · summer-open-house: 1/);
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
