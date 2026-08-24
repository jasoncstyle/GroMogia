import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  draftGrowthPlanSummary,
  draftPlanExcerpt,
  findDraftPlanToApprove,
  findPlanDraftGoal,
  goalNeedsPlanDraft,
} from "./plan-draft";

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

  it("asks for a plan only on an active Goal that is not already reached", () => {
    const goal = {
      id: "goal-1",
      status: "active",
      currentValue: 2,
      targetValue: 10,
      discoveryStatus: "confirmed",
    };
    assert.equal(goalNeedsPlanDraft(goal, []), true);
    assert.equal(
      goalNeedsPlanDraft(goal, [{ goalId: "goal-1", status: "draft" }]),
      false,
    );
    assert.equal(
      goalNeedsPlanDraft({ ...goal, currentValue: 10 }, []),
      false,
    );
    assert.equal(goalNeedsPlanDraft({ ...goal, status: "draft" }, []), false);
    assert.equal(
      goalNeedsPlanDraft({ ...goal, discoveryStatus: "inferred" }, []),
      false,
    );
    assert.equal(
      findPlanDraftGoal(
        [
          { ...goal, currentValue: 10 },
          { id: "goal-2", status: "active", currentValue: 1, targetValue: 8, discoveryStatus: "confirmed" },
        ],
        [],
      )?.id,
      "goal-2",
    );
  });

  it("finds a draft plan on the active Goal for the owner to approve", () => {
    const picked = findDraftPlanToApprove(
      [
        { id: "goal-1", title: "Old Goal", status: "achieved" },
        { id: "goal-2", title: "Next: More people get in touch", status: "active" },
      ],
      [
        {
          id: "plan-old",
          goalId: "goal-1",
          status: "draft",
          version: 3,
          strategySummary: "Old draft.",
        },
        {
          id: "plan-1",
          goalId: "goal-2",
          status: "draft",
          version: 1,
          strategySummary: "Follow up open leads. GroovGro will not start marketing.",
        },
        {
          id: "plan-2",
          goalId: "goal-2",
          status: "draft",
          version: 2,
          strategySummary: "Keep collecting evidence. GroovGro will not run this.",
        },
      ],
    );
    assert.equal(picked?.plan.id, "plan-2");
    assert.equal(picked?.goal.id, "goal-2");
    assert.equal(
      findDraftPlanToApprove(
        [{ id: "goal-2", title: "Next: More people get in touch", status: "active", discoveryStatus: "inferred" }],
        [{ id: "plan-1", goalId: "goal-2", status: "draft", version: 1, strategySummary: "Nope." }],
      ),
      null,
    );
    assert.match(draftPlanExcerpt("Keep collecting evidence. GroovGro will not run this."), /will not run this/);
  });

  it("does not copy the draft-plan next step back into the plan text", () => {
    const summary = draftGrowthPlanSummary({
      businessName: "North Desk",
      description: "",
      targetCustomers: "",
      goal: {
        title: "More people get in touch",
        goalType: "lead_generation",
        status: "active",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "",
        progressPercent: 20,
      },
      offers: [],
      nextStepTitle: "Draft a plan for this Goal",
      nextStepBody: "Draft a plan so GroovGro can propose the first actions.",
      nextStepKind: "recommend",
      leftAlone: [],
      websiteConnected: true,
      openLeadCount: 0,
    });
    assert.doesNotMatch(summary, /Draft a plan for this Goal/);
    assert.match(summary, /Keep collecting/);
  });

  it("does not copy the approve-plan next step back into the plan text", () => {
    const summary = draftGrowthPlanSummary({
      businessName: "North Desk",
      description: "",
      targetCustomers: "",
      goal: {
        title: "More people get in touch",
        goalType: "lead_generation",
        status: "active",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "",
        progressPercent: 20,
      },
      offers: [],
      nextStepTitle: "Approve this plan",
      nextStepBody: "Approve or reject it. Approving does not run marketing.",
      nextStepKind: "recommend",
      leftAlone: [],
      websiteConnected: true,
      openLeadCount: 0,
    });
    assert.doesNotMatch(summary, /Approve this plan/);
    assert.match(summary, /Keep collecting/);
  });

  it("does not copy the propose-actions next step back into the plan text", () => {
    const summary = draftGrowthPlanSummary({
      businessName: "North Desk",
      description: "",
      targetCustomers: "",
      goal: {
        title: "More people get in touch",
        goalType: "lead_generation",
        status: "active",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "",
        progressPercent: 20,
      },
      offers: [],
      nextStepTitle: "Propose the first actions",
      nextStepBody: "Propose the first actions so you can review them.",
      nextStepKind: "recommend",
      leftAlone: [],
      websiteConnected: true,
      openLeadCount: 0,
    });
    assert.doesNotMatch(summary, /Propose the first actions/);
    assert.match(summary, /Keep collecting/);
  });

  it("does not copy the approve-actions next step back into the plan text", () => {
    const summary = draftGrowthPlanSummary({
      businessName: "North Desk",
      description: "",
      targetCustomers: "",
      goal: {
        title: "More people get in touch",
        goalType: "lead_generation",
        status: "active",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "",
        progressPercent: 20,
      },
      offers: [],
      nextStepTitle: "Approve or reject these actions",
      nextStepBody: "Approve or reject them here.",
      nextStepKind: "recommend",
      leftAlone: [],
      websiteConnected: true,
      openLeadCount: 0,
    });
    assert.doesNotMatch(summary, /Approve or reject these actions/);
    assert.match(summary, /Keep collecting/);
  });

  it("does not copy the owner-work next step back into the plan text", () => {
    const summary = draftGrowthPlanSummary({
      businessName: "North Desk",
      description: "",
      targetCustomers: "",
      goal: {
        title: "More people get in touch",
        goalType: "lead_generation",
        status: "active",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "",
        progressPercent: 20,
      },
      offers: [],
      nextStepTitle: "Do the work you already approved",
      nextStepBody: "Do it here. GroovGro will not run it.",
      nextStepKind: "recommend",
      leftAlone: [],
      websiteConnected: true,
      openLeadCount: 0,
    });
    assert.doesNotMatch(summary, /Do the work you already approved/);
    assert.match(summary, /Keep collecting/);
  });

  it("does not copy the check-what-changed next step back into the plan text", () => {
    const summary = draftGrowthPlanSummary({
      businessName: "North Desk",
      description: "",
      targetCustomers: "",
      goal: {
        title: "More people get in touch",
        goalType: "lead_generation",
        status: "active",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "",
        progressPercent: 20,
      },
      offers: [],
      nextStepTitle: "Check what changed",
      nextStepBody: "Compare the Goal number here. GroovGro will not change the plan.",
      nextStepKind: "recommend",
      leftAlone: [],
      websiteConnected: true,
      openLeadCount: 0,
    });
    assert.doesNotMatch(summary, /Check what changed/);
    assert.match(summary, /Keep collecting/);
  });

  it("does not copy the confirm-drafts next step back into the plan text", () => {
    const summary = draftGrowthPlanSummary({
      businessName: "North Desk",
      description: "",
      targetCustomers: "",
      goal: {
        title: "More people get in touch",
        goalType: "lead_generation",
        status: "active",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "",
        progressPercent: 20,
      },
      offers: [],
      nextStepTitle: "Confirm or reject what GroovGro drafted",
      nextStepBody: "Confirm or reject them here. GroovGro will not start marketing.",
      nextStepKind: "recommend",
      leftAlone: [],
      websiteConnected: true,
      openLeadCount: 0,
    });
    assert.doesNotMatch(summary, /Confirm or reject what GroovGro drafted/);
    assert.match(summary, /Keep collecting/);
  });

  it("does not bake industry-specific words into plan helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/plan-draft.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
