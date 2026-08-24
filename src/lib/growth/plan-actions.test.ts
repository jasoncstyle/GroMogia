import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { draftActionsFromApprovedPlan } from "./plan-actions";

describe("growth plan actions", () => {
  it("proposes follow-up and the next step without starting marketing", () => {
    const actions = draftActionsFromApprovedPlan({
      goalTitle: "More people get in touch",
      nextStepTitle: "Follow up open leads",
      nextStepBody: "Open Leads & customers and give each open lead a next step.",
      nextStepKind: "recommend",
      websiteConnected: true,
      openLeadCount: 2,
      confirmedOfferCount: 1,
      inferredOfferCount: 0,
    });

    assert.equal(actions.length, 2);
    assert.equal(actions[0]?.actionType, "follow_up_leads");
    assert.match(actions[0]?.description ?? "", /will not email/);
    assert.equal(actions[1]?.actionType, "do_next_step");
    assert.match(actions[1]?.description ?? "", /will not run/);
    assert.equal(
      actions.every((action) => !["advertising", "email", "social"].includes(action.module)),
      true,
    );
  });

  it("asks to connect the existing website and confirm draft offers", () => {
    const actions = draftActionsFromApprovedPlan({
      goalTitle: "Be easier to find",
      nextStepTitle: "",
      nextStepBody: "",
      nextStepKind: "no_change_yet",
      websiteConnected: false,
      openLeadCount: 0,
      confirmedOfferCount: 0,
      inferredOfferCount: 2,
    });

    const types = actions.map((action) => action.actionType);
    assert.deepEqual(types, ["connect_website", "confirm_offers"]);
    assert.match(actions[0]?.description ?? "", /Do not move the live site/);
  });

  it("says to wait when there is nothing operational to do", () => {
    const actions = draftActionsFromApprovedPlan({
      goalTitle: "More people get in touch",
      nextStepTitle: "Nothing should change yet",
      nextStepBody: "Keep collecting evidence.",
      nextStepKind: "no_change_yet",
      websiteConnected: true,
      openLeadCount: 0,
      confirmedOfferCount: 1,
      inferredOfferCount: 0,
    });

    assert.equal(actions.length, 1);
    assert.equal(actions[0]?.actionType, "watch_progress");
    assert.match(actions[0]?.description ?? "", /Do not change course/);
    assert.doesNotMatch(actions[0]?.description ?? "", /buy ads|send a campaign/i);
  });

  it("never proposes more than three actions", () => {
    const actions = draftActionsFromApprovedPlan({
      goalTitle: "Grow the list",
      nextStepTitle: "Confirm or reject drafts",
      nextStepBody: "Open Business.",
      nextStepKind: "recommend",
      websiteConnected: false,
      openLeadCount: 4,
      confirmedOfferCount: 0,
      inferredOfferCount: 3,
    });
    assert.equal(actions.length, 3);
  });

  it("does not bake industry-specific words into action helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/plan-actions.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
