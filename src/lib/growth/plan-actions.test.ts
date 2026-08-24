import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { draftActionsFromApprovedPlan, findPlanNeedingActions } from "./plan-actions";

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

  it("finds an approved plan on the active Goal that has no actions yet", () => {
    const picked = findPlanNeedingActions(
      [
        { id: "goal-1", title: "Old Goal", status: "achieved" },
        { id: "goal-2", title: "Next: More people get in touch", status: "active" },
      ],
      [
        { id: "plan-old", goalId: "goal-1", status: "approved", version: 1 },
        { id: "plan-1", goalId: "goal-2", status: "approved", version: 1 },
        { id: "plan-2", goalId: "goal-2", status: "approved", version: 2 },
      ],
      [{ planId: "plan-1" }],
    );
    assert.equal(picked?.plan.id, "plan-2");
    assert.equal(picked?.goal.id, "goal-2");
    assert.equal(
      findPlanNeedingActions(
        [{ id: "goal-2", title: "Next: More people get in touch", status: "active" }],
        [{ id: "plan-2", goalId: "goal-2", status: "approved", version: 2 }],
        [{ planId: "plan-2" }],
      ),
      null,
    );
    assert.equal(
      findPlanNeedingActions(
        [{ id: "goal-2", title: "Next: More people get in touch", status: "active" }],
        [{ id: "plan-2", goalId: "goal-2", status: "draft", version: 2 }],
        [],
      ),
      null,
    );
  });

  it("does not copy the propose-actions next step back into action text", () => {
    const actions = draftActionsFromApprovedPlan({
      goalTitle: "More people get in touch",
      nextStepTitle: "Propose the first actions",
      nextStepBody: "Propose the first actions so you can review them.",
      nextStepKind: "recommend",
      websiteConnected: true,
      openLeadCount: 0,
      confirmedOfferCount: 1,
      inferredOfferCount: 0,
    });
    assert.equal(actions.length, 1);
    assert.equal(actions[0]?.actionType, "watch_progress");
    assert.doesNotMatch(actions.map((action) => action.description).join(" "), /Propose the first actions/);
  });

  it("does not copy the approve-actions next step back into action text", () => {
    const actions = draftActionsFromApprovedPlan({
      goalTitle: "More people get in touch",
      nextStepTitle: "Approve or reject these actions",
      nextStepBody: "Approve or reject them here.",
      nextStepKind: "recommend",
      websiteConnected: true,
      openLeadCount: 0,
      confirmedOfferCount: 1,
      inferredOfferCount: 0,
    });
    assert.equal(actions.length, 1);
    assert.equal(actions[0]?.actionType, "watch_progress");
    assert.doesNotMatch(actions.map((action) => action.description).join(" "), /Approve or reject these actions/);
  });

  it("does not copy the owner-work next step back into action text", () => {
    const actions = draftActionsFromApprovedPlan({
      goalTitle: "More people get in touch",
      nextStepTitle: "Do the work you already approved",
      nextStepBody: "Do it here. GroovGro will not run it.",
      nextStepKind: "recommend",
      websiteConnected: true,
      openLeadCount: 0,
      confirmedOfferCount: 1,
      inferredOfferCount: 0,
    });
    assert.equal(actions.length, 1);
    assert.equal(actions[0]?.actionType, "watch_progress");
    assert.doesNotMatch(actions.map((action) => action.description).join(" "), /Do the work you already approved/);
  });

  it("does not copy the check-what-changed next step back into action text", () => {
    const actions = draftActionsFromApprovedPlan({
      goalTitle: "More people get in touch",
      nextStepTitle: "Check what changed",
      nextStepBody: "Compare the Goal number here. GroovGro will not change the plan.",
      nextStepKind: "recommend",
      websiteConnected: true,
      openLeadCount: 0,
      confirmedOfferCount: 1,
      inferredOfferCount: 0,
    });
    assert.equal(actions.length, 1);
    assert.equal(actions[0]?.actionType, "watch_progress");
    assert.doesNotMatch(actions.map((action) => action.description).join(" "), /Check what changed/);
  });

  it("does not bake industry-specific words into action helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/plan-actions.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
