import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { draftGrowthPlanSummary } from "./plan-draft";

describe("growth plan draft", () => {
  it("writes a plan from a Goal and connected facts without starting marketing", () => {
    const summary = draftGrowthPlanSummary({
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      targetCustomers: "people who want practical skills",
      goal: {
        title: "More people get in touch",
        goalType: "lead_generation",
        status: "active",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "2 open leads from the public form.",
        progressPercent: 20,
      },
      offers: [{ name: "Weekend Workshop", description: "A two-day starter session." }],
      nextStepTitle: "Follow up open leads",
      nextStepBody: "Open Leads & customers and give each open lead a next step.",
      nextStepKind: "recommend",
      leftAlone: ["Do not start ads.", "Leave email alone."],
      websiteConnected: true,
      openLeadCount: 2,
    });

    assert.match(summary, /More people get in touch/);
    assert.match(summary, /Harbor Workshops/);
    assert.match(summary, /Weekend Workshop/);
    assert.match(summary, /Follow up open leads/);
    assert.match(summary, /will not email/);
    assert.match(summary, /Do not start ads/);
    assert.match(summary, /Stripe/);
    assert.doesNotMatch(summary, /your own words|TODO|lorem/i);
  });

  it("says to wait when there is no operational next step", () => {
    const summary = draftGrowthPlanSummary({
      businessName: "North Desk",
      description: "",
      targetCustomers: "",
      goal: {
        title: "Be easier to find",
        goalType: "visibility",
        status: "active",
        liveCurrentValue: 0,
        targetValue: null,
        unit: "",
        liveNote: "",
        progressPercent: null,
      },
      offers: [],
      nextStepTitle: "Nothing should change yet",
      nextStepBody: "Keep collecting evidence.",
      nextStepKind: "no_change_yet",
      leftAlone: [],
      websiteConnected: true,
      openLeadCount: 0,
    });
    assert.match(summary, /wait|Keep collecting/i);
    assert.match(summary, /No confirmed offers/);
  });

  it("asks to connect the existing website instead of building a new one", () => {
    const summary = draftGrowthPlanSummary({
      businessName: "North Desk",
      description: "",
      targetCustomers: "",
      goal: {
        title: "More people get in touch",
        goalType: "lead_generation",
        status: "active",
        liveCurrentValue: 0,
        targetValue: 8,
        unit: "leads",
        liveNote: "",
        progressPercent: 0,
      },
      offers: [],
      nextStepTitle: "",
      nextStepBody: "",
      nextStepKind: "no_change_yet",
      leftAlone: [],
      websiteConnected: false,
      openLeadCount: 0,
    });
    assert.match(summary, /Connect the existing website/);
    assert.doesNotMatch(summary, /overwrite|clone|WordPress/i);
  });

  it("does not bake industry-specific words into plan helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/plan-draft.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
