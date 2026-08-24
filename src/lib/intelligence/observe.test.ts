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
});
