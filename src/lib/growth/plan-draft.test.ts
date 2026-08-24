import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ACTIVATE_GOAL_STEP_TITLE,
  ADD_GOAL_STEP_TITLE,
  CONNECT_SEARCH_CONSOLE_STEP_TITLE,
  CONNECT_WEBSITE_STEP_TITLE,
  PASTE_SNIPPET_STEP_TITLE,
  PICK_SEARCH_CONSOLE_STEP_TITLE,
  REFRESH_SEARCH_CONSOLE_STEP_TITLE,
  draftGrowthPlanSummary,
  draftPlanExcerpt,
  findDraftPlanToApprove,
  findPlanDraftGoal,
  FIX_SEO_STEP_TITLE,
  FOLLOW_UP_LEADS_STEP_TITLE,
  GOAL_REACHED_STEP_TITLE,
  goalNeedsPlanDraft,
  hasDedicatedNextStepControls,
  IMPROVE_SEO_STEP_TITLE,
  isAddGoalNextStep,
  isFollowUpLeadsNextStep,
  isPasteSnippetNextStep,
  isReviewScheduleNextStep,
  isSearchConsoleNextStep,
  isSeoDraftNextStep,
  openPageLabelForNextStep,
  READ_GOAL_STEP_TITLE,
  REVIEW_SCHEDULE_STEP_TITLE,
  RUN_SEO_STEP_TITLE,
  showsDedicatedNextStepControl,
  skipsDuplicateNextStepAction,
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

  it("does not copy the connect-website next step back into the plan text", () => {
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
      nextStepTitle: "Connect the existing website",
      nextStepBody: "Paste the tracking snippet on the site you already have.",
      nextStepKind: "recommend",
      leftAlone: [],
      websiteConnected: true,
      openLeadCount: 0,
    });
    assert.doesNotMatch(summary, /Paste the tracking snippet on the site you already have/);
    assert.match(summary, /Keep collecting/);
  });

  it("does not copy the review-website next step back into the plan text", () => {
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
      nextStepTitle: "Review the connected website",
      nextStepBody: "Find pages, then review here.",
      nextStepKind: "recommend",
      leftAlone: [],
      websiteConnected: true,
      openLeadCount: 0,
    });
    assert.doesNotMatch(summary, /Review the connected website/);
    assert.match(summary, /Keep collecting/);
  });

  it("names the Open button for specialist work that already lives on another page", () => {
    assert.equal(openPageLabelForNextStep(FOLLOW_UP_LEADS_STEP_TITLE), null);
    assert.equal(isFollowUpLeadsNextStep(FOLLOW_UP_LEADS_STEP_TITLE), true);
    assert.equal(openPageLabelForNextStep(FIX_SEO_STEP_TITLE), null);
    assert.equal(openPageLabelForNextStep(IMPROVE_SEO_STEP_TITLE), null);
    assert.equal(isSeoDraftNextStep(FIX_SEO_STEP_TITLE), true);
    assert.equal(isSeoDraftNextStep(IMPROVE_SEO_STEP_TITLE), true);
    assert.equal(isSearchConsoleNextStep(CONNECT_SEARCH_CONSOLE_STEP_TITLE), true);
    assert.equal(isSearchConsoleNextStep(PICK_SEARCH_CONSOLE_STEP_TITLE), true);
    assert.equal(isSearchConsoleNextStep(REFRESH_SEARCH_CONSOLE_STEP_TITLE), true);
    assert.equal(isSearchConsoleNextStep(FIX_SEO_STEP_TITLE), false);
    assert.equal(isPasteSnippetNextStep(PASTE_SNIPPET_STEP_TITLE), true);
    assert.equal(isPasteSnippetNextStep(CONNECT_WEBSITE_STEP_TITLE), false);
    assert.equal(openPageLabelForNextStep(REVIEW_SCHEDULE_STEP_TITLE), null);
    assert.equal(isReviewScheduleNextStep(REVIEW_SCHEDULE_STEP_TITLE), true);
    assert.equal(openPageLabelForNextStep(READ_GOAL_STEP_TITLE), "Open Goals");
    assert.equal(openPageLabelForNextStep(ADD_GOAL_STEP_TITLE), null);
    assert.equal(isAddGoalNextStep(ADD_GOAL_STEP_TITLE), true);
    assert.equal(openPageLabelForNextStep(RUN_SEO_STEP_TITLE), null);
    assert.equal(hasDedicatedNextStepControls(GOAL_REACHED_STEP_TITLE), true);
    assert.equal(hasDedicatedNextStepControls(ACTIVATE_GOAL_STEP_TITLE), true);
    assert.equal(hasDedicatedNextStepControls(FOLLOW_UP_LEADS_STEP_TITLE), false);
    assert.equal(
      showsDedicatedNextStepControl(GOAL_REACHED_STEP_TITLE, {
        canCreateGoal: true,
        canActivateGoal: false,
        canDraftPlan: false,
        goalId: "goal-1",
      }),
      true,
    );
    assert.equal(
      showsDedicatedNextStepControl(GOAL_REACHED_STEP_TITLE, {
        canCreateGoal: false,
        canActivateGoal: false,
        canDraftPlan: false,
        goalId: "goal-1",
      }),
      false,
    );
    assert.equal(skipsDuplicateNextStepAction(FOLLOW_UP_LEADS_STEP_TITLE), true);
    assert.equal(skipsDuplicateNextStepAction(RUN_SEO_STEP_TITLE), true);
    assert.equal(skipsDuplicateNextStepAction(FIX_SEO_STEP_TITLE), true);
    assert.equal(skipsDuplicateNextStepAction(CONNECT_SEARCH_CONSOLE_STEP_TITLE), true);
    assert.equal(skipsDuplicateNextStepAction(PICK_SEARCH_CONSOLE_STEP_TITLE), true);
    assert.equal(skipsDuplicateNextStepAction(REFRESH_SEARCH_CONSOLE_STEP_TITLE), true);
    assert.equal(skipsDuplicateNextStepAction(PASTE_SNIPPET_STEP_TITLE), true);
    assert.equal(skipsDuplicateNextStepAction(GOAL_REACHED_STEP_TITLE), true);
    assert.equal(skipsDuplicateNextStepAction("Nothing should change yet"), false);
  });

  it("does not bake industry-specific words into plan helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/plan-draft.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
