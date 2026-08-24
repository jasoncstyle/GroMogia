import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_EVIDENCE_POLICIES } from "./types";
import { buildSpecialistReports, type SpecialistFacts } from "./specialists";
import { coordinateNextStep, isWaitingActionStatus } from "./next-step";

const now = new Date("2026-08-23T12:00:00.000Z");

function facts(overrides: Partial<SpecialistFacts> = {}): SpecialistFacts {
  return {
    now,
    goals: [],
    inferredDraftCount: 0,
    policies: [...DEFAULT_EVIDENCE_POLICIES],
    websiteConnected: true,
    websiteUrl: "https://example.com",
    seoScore: 80,
    seoSummary: "Clear starting place",
    seoFailCount: 0,
    seoWarnCount: 0,
    seoCheckedAt: now,
    searchConsoleConnected: true,
    searchConsoleProperty: true,
    searchConsoleSnapshot: true,
    searchConsoleSnapshotAt: now,
    openLeadCount: 0,
    contactCount: 1,
    recordedVisitCount: 1,
    brandVoiceSaved: true,
    brandVoiceExampleSaved: true,
    brandVoiceDraftSaved: true,
    brandSettingsSaved: true,
    businessBrainSaved: true,
    goalProgressNeedsSave: false,
    stripeConfigured: true,
    stripeConnected: true,
    stripeSynced: true,
    growthScheduleSaved: true,
    confirmedOfferCount: 1,
    upcomingEventCount: 0,
    evidenceSample: { elapsedDays: 2, observations: 3, conversions: 0 },
    advertisingConnected: false,
    emailConnected: false,
    socialConnected: false,
    ...overrides,
  };
}

describe("coordinated next step", () => {
  it("asks the owner to confirm drafts before other work", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 2,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 2, openLeadCount: 4 })),
      waitingActions: [],
    });
    assert.equal(step.primary.href, "/app/next-step");
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.primary.classification, "operational");
    assert.equal(step.executeAllowed, false);
    assert.match(step.primary.body, /will not start marketing/);
    assert.match(step.primary.body, /here/);
  });

  it("keeps suggested drafts on the next step so the owner can confirm them there", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [],
      inferredDrafts: [
        {
          id: "offer-1",
          kind: "offer",
          title: "Weekend Workshop",
          description: "A two-day starter session.",
          inferredFrom: "website",
          confidence: 70,
        },
      ],
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.inferredDrafts.length, 1);
    assert.equal(step.inferredDrafts[0]?.id, "offer-1");
  });

  it("picks follow-up of open leads over disconnected ad channels", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [],
      openLeads: [
        {
          id: "lead-1",
          name: "Alex Rivera",
          email: "alex@example.com",
          stageId: "stage-new",
          stageName: "New",
          source: "website",
          isWon: false,
        },
      ],
      leadStages: [{ id: "stage-new", name: "New" }],
    });
    assert.equal(step.primary.href, "/app/next-step");
    assert.equal(step.primary.title, "Follow up open leads");
    assert.match(step.primary.body, /Give each open lead a next step here/);
    assert.equal(step.openLeads.length, 1);
    assert.equal(step.openLeads[0]?.id, "lead-1");
    assert.match(page, /isFollowUpLeadsNextStep/);
    assert.match(page, /LeadFollowUpButtons/);
    assert.match(page, /CopyLink/);
    assert.equal(
      step.leftAlone.some((item) => /ads/i.test(item.title) || /advertising/i.test(item.body)),
      true,
    );
  });

  it("keeps Follow up open leads on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({ inferredDraftCount: 1, openLeadCount: 3 }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
      openLeads: [
        {
          id: "lead-1",
          name: "Alex Rivera",
          email: "alex@example.com",
          stageId: "stage-new",
          stageName: "New",
          source: "website",
          isWon: false,
        },
      ],
      leadStages: [{ id: "stage-new", name: "New" }],
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.openLeads.length, 1);
    assert.match(page, /openLeads\.length > 0/);
    assert.match(page, /!isFollowUpLeadsNextStep/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/crm/page.tsx"), "utf8"),
      /moveLead/,
    );
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/crm/page.tsx"), "utf8"),
      /convertLeadToCustomer/,
    );
  });

  it("says nothing should change when evidence is thin and work is current", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
    });
    assert.equal(step.primary.kind, "no_change_yet");
    assert.equal(step.primary.href, "/app/next-step");
    assert.equal(step.primary.source, "review");
    assert.match(step.primary.body, /will not start ads/);
  });

  it("lists proposed actions as waiting without treating them as executed", () => {
    assert.equal(isWaitingActionStatus("proposed"), true);
    assert.equal(isWaitingActionStatus("approved"), false);
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [
        {
          id: "a1",
          description: "Follow up open leads.",
          module: "crm",
          status: "proposed",
          risk: "operational",
        },
      ],
    });
    assert.equal(step.waitingActions.length, 1);
    assert.equal(step.primary.title, "Approve or reject these actions");
    assert.match(step.primary.body, /will not start marketing/);
    assert.equal(step.executeAllowed, false);
  });

  it("sends the owner to approved work before specialist follow-up", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [],
      openWorkCount: 2,
    });
    assert.equal(step.primary.href, "/app/next-step");
    assert.equal(step.primary.source, "owner_work");
    assert.equal(step.primary.title, "Do the work you already approved");
    assert.match(step.primary.body, /will not run/);
    assert.match(step.primary.body, /here/);
    assert.equal(step.executeAllowed, false);
  });

  it("keeps approved work on the next step so the owner can mark it there", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      openWork: [
        {
          id: "w1",
          description: "Follow up open leads.",
          module: "crm",
          actionType: "follow_up_leads",
          risk: "operational",
        },
      ],
    });
    assert.equal(step.primary.title, "Do the work you already approved");
    assert.equal(step.openWork.length, 1);
    assert.equal(step.openWork[0]?.id, "w1");
    assert.match(step.primary.body, /here/);
  });

  it("asks the owner to check what changed after work is marked done", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [],
      uncheckedWork: [
        {
          id: "w1",
          description: "Follow up open leads.",
          status: "completed_by_owner",
        },
      ],
    });
    assert.equal(step.primary.title, "Check what changed");
    assert.equal(step.primary.href, "/app/next-step");
    assert.equal(step.primary.source, "learning");
    assert.equal(step.uncheckedWork.length, 1);
    assert.equal(step.uncheckedWork[0]?.id, "w1");
    assert.match(step.primary.body, /will not change the plan/);
    assert.equal(step.executeAllowed, false);
  });

  it("keeps approved work ahead of checking what changed", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      openWorkCount: 1,
      uncheckedWorkCount: 1,
    });
    assert.equal(step.primary.title, "Do the work you already approved");
  });

  it("keeps checking what changed ahead of activating a next Goal", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      uncheckedWorkCount: 1,
      activateGoalId: "goal-2",
      activateGoalTitle: "Next: More people get in touch",
    });
    assert.equal(step.primary.title, "Check what changed");
  });

  it("keeps draft confirm ahead of approved work", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 1 })),
      waitingActions: [],
      openWorkCount: 2,
    });
    assert.equal(step.primary.href, "/app/next-step");
    assert.equal(step.primary.source, "drafts");
  });

  it("uses what changed to wait instead of starting a new channel", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [],
      openWorkCount: 0,
      latestLearningKind: "too_soon",
      latestLearningOutcome: "Wait before changing course. Do not change the plan, start ads, send email, or change the live website.",
    });
    assert.equal(step.primary.kind, "no_change_yet");
    assert.equal(step.primary.source, "learning");
    assert.match(step.primary.body, /Wait before changing course/);
    assert.doesNotMatch(step.primary.body, /buy ads/i);
  });

  it("asks the owner to activate a drafted next Goal before drafting another", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      latestLearningKind: "target_reached",
      latestLearningOutcome: "The Goal reached its target. GroovGro will not start a new campaign.",
      latestLearningGoalId: "goal-1",
      activateGoalId: "goal-2",
      activateGoalTitle: "Next: More people get in touch",
    });
    assert.equal(step.primary.title, "Make this the active Goal");
    assert.equal(step.primary.href, "/app/next-step");
    assert.equal(step.primary.source, "goals");
    assert.equal(step.primary.goalId, "goal-2");
    assert.match(step.primary.body, /will not start marketing/);
    assert.equal(step.executeAllowed, false);
  });

  it("keeps draft confirm ahead of activating a next Goal", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 1 })),
      waitingActions: [],
      activateGoalId: "goal-2",
      activateGoalTitle: "Next: More people get in touch",
    });
    assert.equal(step.primary.source, "drafts");
    assert.equal(step.primary.href, "/app/next-step");
  });

  it("keeps Activate Goal on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 1 })),
      waitingActions: [],
      activateGoalId: "goal-2",
      activateGoalTitle: "Next: More people get in touch",
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.activateGoalId, "goal-2");
    assert.equal(step.activateGoalTitle, "Next: More people get in touch");
    assert.match(page, /activateGoalId/);
    assert.match(page, /primary\.title !== ACTIVATE_GOAL_STEP_TITLE/);
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), "src/app/(app)/app/goals/page.tsx"), "utf8"),
      /ActivateGoalButton/,
    );
  });

  it("asks the owner to draft a plan for an active Goal after moving on", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      latestLearningKind: "target_reached",
      latestLearningOutcome: "The Goal reached its target. GroovGro will not start a new campaign.",
      latestLearningGoalId: "goal-1",
      activeGoalIds: ["goal-2"],
      planGoalId: "goal-2",
      planGoalTitle: "Next: More people get in touch",
    });
    assert.equal(step.primary.title, "Draft a plan for this Goal");
    assert.equal(step.primary.goalId, "goal-2");
    assert.equal(step.primary.source, "goals");
    assert.match(step.primary.body, /will not run it/);
    assert.equal(step.executeAllowed, false);
  });

  it("keeps activate ahead of drafting a plan", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      activateGoalId: "goal-2",
      activateGoalTitle: "Next: More people get in touch",
      planGoalId: "goal-3",
      planGoalTitle: "Another Goal",
    });
    assert.equal(step.primary.title, "Make this the active Goal");
  });

  it("keeps Draft a plan on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      activateGoalId: "goal-2",
      activateGoalTitle: "Next: More people get in touch",
      planGoalId: "goal-3",
      planGoalTitle: "Another Goal",
    });
    assert.equal(step.primary.title, "Make this the active Goal");
    assert.equal(step.planGoalId, "goal-3");
    assert.equal(step.planGoalTitle, "Another Goal");
    assert.match(page, /planGoalId/);
    assert.match(page, /primary\.title !== DRAFT_PLAN_STEP_TITLE/);
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), "src/app/(app)/app/goals/page.tsx"), "utf8"),
      /DraftGrowthPlanButton/,
    );
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/goals/page.tsx"), "utf8"),
      /Write a plan yourself/,
    );
  });

  it("asks the owner to approve a draft plan before specialist follow-up", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [],
      approvePlanId: "plan-2",
      approvePlanGoalId: "goal-2",
      approvePlanGoalTitle: "Next: More people get in touch",
      approvePlanVersion: 2,
      approvePlanExcerpt: "Follow up open leads. GroovGro will not run this.",
    });
    assert.equal(step.primary.title, "Approve this plan");
    assert.equal(step.primary.planId, "plan-2");
    assert.equal(step.primary.goalId, "goal-2");
    assert.equal(step.primary.source, "goals");
    assert.match(step.primary.body, /does not run marketing/);
    assert.match(step.primary.body, /will not run this/);
    assert.equal(step.executeAllowed, false);
  });

  it("keeps drafting a missing plan ahead of approving a different draft", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      planGoalId: "goal-2",
      planGoalTitle: "Next: More people get in touch",
      approvePlanId: "plan-9",
      approvePlanGoalId: "goal-9",
      approvePlanGoalTitle: "Something else",
    });
    assert.equal(step.primary.title, "Draft a plan for this Goal");
  });

  it("keeps Approve a plan on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      planGoalId: "goal-2",
      planGoalTitle: "Next: More people get in touch",
      approvePlanId: "plan-9",
      approvePlanGoalId: "goal-9",
      approvePlanGoalTitle: "Something else",
    });
    assert.equal(step.primary.title, "Draft a plan for this Goal");
    assert.equal(step.approvePlanId, "plan-9");
    assert.match(page, /approvePlanId/);
    assert.match(page, /primary\.title !== APPROVE_PLAN_STEP_TITLE/);
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), "src/app/(app)/app/goals/page.tsx"), "utf8"),
      /GrowthPlanReviewButtons/,
    );
  });

  it("asks the owner to propose first actions after a plan is approved", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [],
      proposePlanId: "plan-2",
      proposePlanGoalId: "goal-2",
      proposePlanGoalTitle: "Next: More people get in touch",
      proposePlanVersion: 2,
    });
    assert.equal(step.primary.title, "Propose the first actions");
    assert.equal(step.primary.planId, "plan-2");
    assert.equal(step.primary.goalId, "goal-2");
    assert.equal(step.primary.source, "goals");
    assert.match(step.primary.body, /will not run them/);
    assert.equal(step.executeAllowed, false);
  });

  it("keeps approving a draft plan ahead of proposing actions", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      approvePlanId: "plan-1",
      approvePlanGoalId: "goal-1",
      approvePlanGoalTitle: "More people get in touch",
      proposePlanId: "plan-2",
      proposePlanGoalId: "goal-2",
      proposePlanGoalTitle: "Next: More people get in touch",
    });
    assert.equal(step.primary.title, "Approve this plan");
  });

  it("keeps Propose first actions on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      approvePlanId: "plan-1",
      approvePlanGoalId: "goal-1",
      approvePlanGoalTitle: "More people get in touch",
      proposePlanId: "plan-2",
      proposePlanGoalId: "goal-2",
      proposePlanGoalTitle: "Next: More people get in touch",
    });
    assert.equal(step.primary.title, "Approve this plan");
    assert.equal(step.proposePlanId, "plan-2");
    assert.match(page, /proposePlanId/);
    assert.match(page, /primary\.title !== PROPOSE_ACTIONS_STEP_TITLE/);
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), "src/app/(app)/app/goals/page.tsx"), "utf8"),
      /ProposePlanActionsButton/,
    );
  });

  it("asks the owner to approve proposed actions before specialist follow-up", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [
        {
          id: "a1",
          description: "Follow up open leads.",
          module: "crm",
          status: "proposed",
          risk: "operational",
        },
      ],
    });
    assert.equal(step.primary.title, "Approve or reject these actions");
    assert.equal(step.waitingActions.length, 1);
    assert.match(step.primary.body, /does not run/);
    assert.equal(step.executeAllowed, false);
  });

  it("keeps proposing missing actions ahead of approving leftover proposals", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [
        {
          id: "a1",
          description: "Follow up open leads.",
          module: "crm",
          status: "proposed",
          risk: "operational",
        },
      ],
      proposePlanId: "plan-2",
      proposePlanGoalId: "goal-2",
      proposePlanGoalTitle: "Next: More people get in touch",
    });
    assert.equal(step.primary.title, "Propose the first actions");
  });

  it("keeps Goal reached on Next step", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      latestLearningKind: "target_reached",
      latestLearningOutcome: "The Goal reached its target. GroovGro will not start a new campaign.",
      latestLearningGoalId: "goal-1",
    });
    assert.equal(step.primary.href, "/app/next-step");
    assert.equal(step.primary.source, "learning");
    assert.match(step.primary.body, /will not start a new campaign/);
  });

  it("keeps Draft the next Goal on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 1 })),
      waitingActions: [],
      latestLearningKind: "target_reached",
      latestLearningOutcome: "The Goal reached its target. GroovGro will not start a new campaign.",
      latestLearningGoalId: "goal-1",
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.reachedGoalId, "goal-1");
    assert.match(page, /reachedGoalId/);
    assert.match(page, /primary\.title !== GOAL_REACHED_STEP_TITLE/);
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), "src/app/(app)/app/goals/page.tsx"), "utf8"),
      /DraftNextGoalButton/,
    );
    const alreadyDrafted = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 1 })),
      waitingActions: [],
      latestLearningKind: "target_reached",
      latestLearningOutcome: "The Goal reached its target. GroovGro will not start a new campaign.",
      latestLearningGoalId: "goal-1",
      activateGoalId: "goal-2",
      activateGoalTitle: "Next: More people get in touch",
    });
    assert.equal(alreadyDrafted.reachedGoalId, null);
  });

  it("puts Add a Goal on Next step when work was not tied to a Goal", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const goalsPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/goals/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      latestLearningKind: "no_goal",
      latestLearningOutcome:
        "This work is not tied to a Goal number, so GroovGro cannot compare progress. Add a Goal here so GroovGro can compare a number.",
    });
    assert.equal(step.primary.title, "Add a Goal so GroovGro can compare a number");
    assert.equal(step.primary.href, "/app/next-step");
    assert.match(step.primary.body, /Add a Goal here/);
    assert.match(page, /isAddGoalNextStep/);
    assert.match(page, /GoalCreateForm/);
    assert.match(goalsPage, /GoalCreateForm/);
  });

  it("keeps Add a Goal on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 1 })),
      waitingActions: [],
      latestLearningKind: "no_goal",
      latestLearningOutcome:
        "This work is not tied to a Goal number, so GroovGro cannot compare progress. Add a Goal here so GroovGro can compare a number.",
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsAddGoal, true);
    assert.match(page, /needsAddGoal/);
    assert.match(page, /!isAddGoalNextStep\(step\.primary\.title\)/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/goals/page.tsx"), "utf8"),
      /GoalCreateForm/,
    );
  });

  it("puts the Goal numbers on Next step when the number is lower", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      latestLearningKind: "declined",
      latestLearningOutcome:
        "After you did this work, the Goal is lower. Do not add spend. Read the Goal number here.",
      latestLearningGoalId: "goal-1",
      learningGoal: {
        id: "goal-1",
        title: "More people get in touch",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "2 open leads from the public form.",
        progressPercent: 20,
      },
    });
    assert.equal(step.primary.title, "Read the Goal before changing course");
    assert.equal(step.primary.href, "/app/next-step");
    assert.equal(step.learningGoal?.id, "goal-1");
    assert.equal(step.learningGoal?.liveCurrentValue, 2);
    assert.deepEqual(step.learningGoal?.progressHistory, []);
    assert.match(step.primary.body, /Read the Goal number here/);
    assert.match(page, /isReadGoalNextStep/);
    assert.match(page, /learningGoal/);
    assert.match(page, /GoalReadout/);
    assert.match(page, /Saved progress/);
    assert.doesNotMatch(page, /The Goal number is on Goals/);
  });

  it("does not bake industry-specific words into the coordinator", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/next-step.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });

  it("puts I did this and Skip on Next step for approved work", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(source, /OwnerWorkButtons/);
    assert.match(source, /OWNER_WORK_STEP_TITLE/);
    assert.match(source, /hrefForGrowthAction/);
    assert.match(source, /showOpenPage=\{false\}/);
  });

  it("keeps I did this on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 1 })),
      waitingActions: [],
      openWork: [
        {
          id: "w1",
          description: "Follow up open leads.",
          module: "crm",
          actionType: "follow_up_leads",
          risk: "operational",
        },
      ],
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.openWork.length, 1);
    assert.match(page, /openWork\.length > 0/);
    assert.match(page, /primary\.title !== OWNER_WORK_STEP_TITLE/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/work/page.tsx"), "utf8"),
      /OwnerWorkButtons/,
    );
  });

  it("puts Check what changed on Next step for finished work", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(source, /CheckWhatChangedButton/);
    assert.match(source, /CHECK_CHANGED_STEP_TITLE/);
    assert.match(source, /uncheckedWork\.length > 0/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/work/page.tsx"), "utf8"),
      /CheckWhatChangedButton/,
    );
  });

  it("keeps Check what changed on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      openWorkCount: 1,
      uncheckedWork: [
        {
          id: "w1",
          description: "Follow up open leads.",
          status: "completed_by_owner",
        },
      ],
    });
    assert.equal(step.primary.title, "Do the work you already approved");
    assert.equal(step.uncheckedWork.length, 1);
    assert.match(page, /uncheckedWork\.length > 0/);
    assert.match(page, /primary\.title !== CHECK_CHANGED_STEP_TITLE/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/work/page.tsx"), "utf8"),
      /CheckWhatChangedButton/,
    );
  });

  it("puts Confirm and Reject on Next step for Business drafts", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(source, /ConfirmRejectButtons/);
    assert.match(source, /CONFIRM_DRAFTS_STEP_TITLE/);
  });

  it("puts the website address form on Next step when the site is not connected", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(source, /WebsiteConnectForm/);
    assert.match(source, /CONNECT_WEBSITE_STEP_TITLE/);
  });

  it("keeps Connect website on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({ inferredDraftCount: 1, websiteConnected: false, websiteUrl: "" }),
      ),
      waitingActions: [],
      websiteConnected: false,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsConnectWebsite, true);
    assert.match(page, /needsConnectWebsite/);
    assert.match(page, /primary\.title !== CONNECT_WEBSITE_STEP_TITLE/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/website/page.tsx"), "utf8"),
      /name="publicUrl"/,
    );
  });

  it("asks the owner to review a saved website before specialist follow-up", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3, websiteConnected: true })),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: false,
    });
    assert.equal(step.primary.title, "Review the connected website");
    assert.equal(step.primary.href, "/app/next-step");
    assert.equal(step.primary.source, "website");
    assert.match(step.primary.body, /Find pages here/);
    assert.match(step.primary.body, /will not change the live site/);
    assert.equal(step.executeAllowed, false);
  });

  it("keeps confirming drafts ahead of reviewing a saved website", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 1, websiteConnected: true })),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: false,
    });
    assert.equal(step.primary.source, "drafts");
  });

  it("keeps website review on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 1, websiteConnected: true })),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: false,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsWebsiteReview, true);
    assert.match(page, /needsWebsiteReview/);
    assert.match(page, /primary\.title !== REVIEW_SITE_STEP_TITLE/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/business/page.tsx"), "utf8"),
      /ReviewConnectedDataButton/,
    );
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), "src/app/(app)/app/website/page.tsx"), "utf8"),
      /WebsitePageChecklist/,
    );
    const alreadyRead = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 1, websiteConnected: true })),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(alreadyRead.needsWebsiteReview, false);
  });

  it("puts Review connected data on Next step when the site is saved but unread", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(source, /ReviewConnectedDataButton/);
    assert.match(source, /WebsitePageChecklist/);
    assert.match(source, /REVIEW_SITE_STEP_TITLE/);
  });

  it("keeps Review connected data off Dashboard, Goals, and Offers", () => {
    const dashboard = readFileSync(
      join(process.cwd(), "src/app/(app)/app/page.tsx"),
      "utf8",
    );
    const goals = readFileSync(
      join(process.cwd(), "src/app/(app)/app/goals/page.tsx"),
      "utf8",
    );
    const offers = readFileSync(
      join(process.cwd(), "src/app/(app)/app/offers/page.tsx"),
      "utf8",
    );
    const business = readFileSync(
      join(process.cwd(), "src/app/(app)/app/business/page.tsx"),
      "utf8",
    );
    const nextStep = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(dashboard, /ReviewConnectedDataButton/);
    assert.doesNotMatch(goals, /ReviewConnectedDataButton/);
    assert.doesNotMatch(offers, /ReviewConnectedDataButton/);
    assert.match(goals, /Review connected data on Next step/);
    assert.match(offers, /Review connected data on Next step when/);
    assert.match(business, /ReviewConnectedDataButton/);
    assert.match(nextStep, /ReviewConnectedDataButton/);
  });

  it("opens Leads, SEO, or Events from Next step without I’ll do this", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const buttons = readFileSync(
      join(process.cwd(), "src/components/next-step-actions.tsx"),
      "utf8",
    );
    assert.match(page, /openPageLabelForNextStep/);
    assert.match(page, /OpenPageNextStepButtons/);
    assert.match(page, /hasDedicatedNextStepControls/);
    assert.match(page, /showsDedicatedNextStepControl/);
    const openPage = buttons.slice(
      buttons.indexOf("OpenPageNextStepButtons"),
      buttons.indexOf("NextStepResponseButtons"),
    );
    assert.equal(openPage.includes("do_this"), false);
    assert.equal(openPage.includes("I’ll do this"), false);
  });

  it("saves this week’s growth review on Next step when the wait is from the review", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(page, /SaveGrowthReviewButton/);
    assert.match(page, /source === "review"/);
  });

  it("keeps Save nothing yet after Check what changed when the outcome is wait", () => {
    const buttons = readFileSync(
      join(process.cwd(), "src/components/next-step-actions.tsx"),
      "utf8",
    );
    assert.match(buttons, /Save “nothing yet”/);
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [],
      latestLearningKind: "too_soon",
      latestLearningOutcome: "Wait before changing course.",
    });
    assert.equal(step.primary.kind, "no_change_yet");
    assert.equal(step.primary.source, "learning");
  });

  it("puts Draft improvements on Next step when SEO items need a review", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      seoDrafts: [
        {
          id: "d1",
          title: "Add a page title",
          proposedChange: "Harbor Workshops | Hands-on classes",
          howToApply: "Paste into the title tag.",
        },
      ],
    });
    assert.equal(step.seoDrafts.length, 1);
    assert.equal(step.seoDrafts[0]?.id, "d1");
    assert.match(page, /isSeoDraftNextStep/);
    assert.match(page, /DraftSeoImprovementsButton/);
    assert.match(page, /SeoDraftDecisionButtons/);
    const queries = readFileSync(
      join(process.cwd(), "src/lib/growth/queries.ts"),
      "utf8",
    );
    assert.match(queries, /getOpenSeoDrafts/);
    assert.match(queries, /isNull\(seoDrafts\.builderSiteId\)/);
    const blocking = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          seoScore: 42,
          seoSummary: "Missing title and description.",
          seoFailCount: 2,
          seoWarnCount: 1,
          seoCheckedAt: now,
          openLeadCount: 0,
        }),
      ),
      waitingActions: [],
    });
    assert.equal(blocking.primary.title, "Fix blocking SEO items");
  });

  it("puts Run homepage check on Next step when no SEO check is saved", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({ seoCheckedAt: null, openLeadCount: 0, websiteConnected: true }),
      ),
      waitingActions: [],
    });
    assert.equal(step.primary.title, "Run an SEO check");
    assert.equal(step.primary.href, "/app/next-step");
    assert.match(page, /RUN_SEO_STEP_TITLE/);
    assert.match(page, /RunHomepageSeoButton/);
  });

  it("keeps Run an SEO check on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          seoCheckedAt: null,
          websiteConnected: true,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsRunSeo, true);
    assert.match(page, /needsRunSeo/);
    assert.match(page, /primary.title !== RUN_SEO_STEP_TITLE/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/seo/page.tsx"), "utf8"),
      /runSeoAudit/,
    );
  });

  it("keeps SEO drafts on Next step when they are not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          seoScore: 42,
          seoSummary: "Missing title and description.",
          seoFailCount: 2,
          seoWarnCount: 1,
          seoCheckedAt: now,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsSeoDraft, true);
    assert.match(page, /needsSeoDraft/);
    assert.match(page, /!isSeoDraftNextStep/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/seo/page.tsx"), "utf8"),
      /createSeoDrafts/,
    );
  });

  it("puts Connect Search Console on Next step after a homepage check", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          searchConsoleConnected: false,
          openLeadCount: 0,
          seoScore: 88,
          seoFailCount: 0,
          seoWarnCount: 0,
          seoCheckedAt: now,
        }),
      ),
      waitingActions: [],
    });
    assert.equal(step.primary.title, "Connect Search Console");
    assert.equal(step.primary.classification, "optimization");
    assert.match(step.primary.body, /will not edit the website/);
    assert.match(page, /isSearchConsoleNextStep/);
    assert.match(page, /SearchConsolePanel/);
  });

  it("puts Choose the Search Console property on Next step after Google sign-in", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const start = readFileSync(
      join(process.cwd(), "src/app/api/google/start/route.ts"),
      "utf8",
    );
    const callback = readFileSync(
      join(process.cwd(), "src/app/api/google/callback/route.ts"),
      "utf8",
    );
    const complete = readFileSync(
      join(process.cwd(), "src/lib/actions/search-console.ts"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          searchConsoleConnected: true,
          searchConsoleProperty: false,
          openLeadCount: 0,
          seoScore: 88,
          seoFailCount: 0,
          seoWarnCount: 0,
          seoCheckedAt: now,
        }),
      ),
      waitingActions: [],
    });
    assert.equal(step.primary.title, "Choose the Search Console property");
    assert.equal(step.primary.classification, "optimization");
    assert.match(step.primary.body, /Choose the Search Console property here/);
    assert.match(page, /SearchConsolePanel/);
    assert.match(start, /\/app\/next-step\?/);
    assert.match(callback, /\/app\/next-step\?/);
    assert.match(complete, /\/app\/next-step\?gsc=pick/);
  });

  it("keeps follow-up of open leads ahead of choosing a Search Console property", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          searchConsoleConnected: true,
          searchConsoleProperty: false,
          openLeadCount: 3,
          seoScore: 88,
          seoFailCount: 0,
          seoWarnCount: 0,
          seoCheckedAt: now,
        }),
      ),
      waitingActions: [],
    });
    assert.equal(step.primary.title, "Follow up open leads");
  });

  it("puts Refresh Search Console on Next step when a property is saved but no numbers are stored", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/search-console-panel.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          searchConsoleConnected: true,
          searchConsoleProperty: true,
          searchConsoleSnapshot: false,
          openLeadCount: 0,
          seoScore: 88,
          seoFailCount: 0,
          seoWarnCount: 0,
          seoCheckedAt: now,
        }),
      ),
      waitingActions: [],
    });
    assert.equal(step.primary.title, "Refresh Search Console numbers");
    assert.equal(step.primary.classification, "optimization");
    assert.match(step.primary.body, /Refresh here/);
    assert.match(page, /isSearchConsoleNextStep/);
    assert.match(page, /SearchConsolePanel/);
    assert.match(panel, /Refresh Search Console/);
  });

  it("keeps follow-up of open leads ahead of refreshing Search Console", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          searchConsoleConnected: true,
          searchConsoleProperty: true,
          searchConsoleSnapshot: false,
          openLeadCount: 3,
          seoScore: 88,
          seoFailCount: 0,
          seoWarnCount: 0,
          seoCheckedAt: now,
        }),
      ),
      waitingActions: [],
    });
    assert.equal(step.primary.title, "Follow up open leads");
  });

  it("puts Refresh Search Console on Next step when stored numbers are more than a week old", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          searchConsoleConnected: true,
          searchConsoleProperty: true,
          searchConsoleSnapshot: true,
          searchConsoleSnapshotAt: new Date("2026-08-15T12:00:00.000Z"),
          openLeadCount: 0,
          seoScore: 88,
          seoFailCount: 0,
          seoWarnCount: 0,
          seoCheckedAt: now,
        }),
      ),
      waitingActions: [],
    });
    assert.equal(step.primary.title, "Refresh Search Console numbers");
    assert.equal(step.primary.classification, "optimization");
    assert.match(step.primary.body, /more than a week old/);
    assert.match(page, /isSearchConsoleNextStep/);
    assert.match(page, /SearchConsolePanel/);
  });

  it("keeps follow-up of open leads ahead of refreshing stale Search Console numbers", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          searchConsoleConnected: true,
          searchConsoleProperty: true,
          searchConsoleSnapshot: true,
          searchConsoleSnapshotAt: new Date("2026-08-15T12:00:00.000Z"),
          openLeadCount: 3,
          seoScore: 88,
          seoFailCount: 0,
          seoWarnCount: 0,
          seoCheckedAt: now,
        }),
      ),
      waitingActions: [],
    });
    assert.equal(step.primary.title, "Follow up open leads");
  });

  it("puts the tracking snippet on Next step when a site is connected but no visits are recorded", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          recordedVisitCount: 0,
          openLeadCount: 0,
          searchConsoleConnected: true,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Paste the tracking snippet");
    assert.equal(step.primary.classification, "optimization");
    assert.match(step.primary.body, /does not replace that site/);
    assert.match(page, /isPasteSnippetNextStep/);
    assert.match(page, /TrackingSnippet/);
  });

  it("keeps the tracking snippet on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          recordedVisitCount: 0,
          websiteConnected: true,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsPasteSnippet, true);
    assert.match(page, /needsPasteSnippet/);
    assert.match(page, /!isPasteSnippetNextStep/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/website/page.tsx"), "utf8"),
      /TrackingSnippet/,
    );
  });

  it("keeps follow-up of open leads ahead of pasting the tracking snippet", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          recordedVisitCount: 0,
          openLeadCount: 3,
          searchConsoleConnected: true,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Follow up open leads");
  });

  it("puts Share the public lead form on Next step when no person has been captured yet", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          openLeadCount: 0,
          contactCount: 0,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Share the public lead form");
    assert.equal(step.primary.classification, "optimization");
    assert.match(step.primary.body, /will not email anyone/);
    assert.match(page, /isShareLeadFormNextStep/);
    assert.match(page, /CopyLink/);
    assert.match(page, /LeadCreateForm/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/crm/page.tsx"), "utf8"),
      /LeadCreateForm/,
    );
  });

  it("keeps Share the public lead form on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          openLeadCount: 0,
          contactCount: 0,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsShareLeadForm, true);
    assert.match(page, /needsShareLeadForm/);
    assert.match(page, /!isShareLeadFormNextStep/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/crm/page.tsx"), "utf8"),
      /LeadCreateForm/,
    );
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/crm/page.tsx"), "utf8"),
      /CopyLink/,
    );
  });

  it("keeps pasting the tracking snippet ahead of sharing the lead form", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          recordedVisitCount: 0,
          openLeadCount: 0,
          contactCount: 0,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Paste the tracking snippet");
  });

  it("puts Save your brand voice on Next step when visits are recorded but no profile exists", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          brandVoiceSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Save your brand voice");
    assert.equal(step.primary.classification, "strategic");
    assert.match(step.primary.body, /will not send email/);
    assert.match(step.primary.body, /edit the live website/);
    assert.match(page, /isSaveBrandVoiceNextStep/);
    assert.match(page, /BrandVoiceProfileForm/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/brand-voice/page.tsx"),
        "utf8",
      ),
      /BrandVoiceProfileForm/,
    );
  });

  it("keeps Save your brand voice on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          brandVoiceSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsSaveBrandVoice, true);
    assert.match(page, /needsSaveBrandVoice/);
    assert.match(page, /!isSaveBrandVoiceNextStep/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/brand-voice/page.tsx"),
        "utf8",
      ),
      /BrandVoiceProfileForm/,
    );
  });

  it("keeps sharing the lead form ahead of saving brand voice", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          brandVoiceSaved: false,
          recordedVisitCount: 1,
          openLeadCount: 0,
          contactCount: 0,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Share the public lead form");
  });

  it("keeps follow-up of open leads ahead of saving brand voice", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          brandVoiceSaved: false,
          recordedVisitCount: 1,
          openLeadCount: 3,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Follow up open leads");
  });

  it("puts Add a brand voice example on Next step after the profile is saved", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          brandVoiceSaved: true,
          brandVoiceExampleSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Add a brand voice example");
    assert.equal(step.primary.classification, "strategic");
    assert.match(step.primary.body, /Paste writing you already like here/);
    assert.match(step.primary.body, /will not send email/);
    assert.match(page, /isAddBrandVoiceExampleNextStep/);
    assert.match(page, /BrandVoiceExampleForm/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/brand-voice/page.tsx"),
        "utf8",
      ),
      /BrandVoiceExampleForm/,
    );
  });

  it("keeps Add a brand voice example on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          brandVoiceExampleSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsAddBrandVoiceExample, true);
    assert.match(page, /needsAddBrandVoiceExample/);
    assert.match(page, /!isAddBrandVoiceExampleNextStep/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/brand-voice/page.tsx"),
        "utf8",
      ),
      /BrandVoiceExampleForm/,
    );
  });

  it("keeps saving the brand voice profile ahead of adding an example", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          brandVoiceSaved: false,
          brandVoiceExampleSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Save your brand voice");
  });

  it("puts Draft copy in your voice on Next step after the profile and an example are saved", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          brandVoiceSaved: true,
          brandVoiceExampleSaved: true,
          brandVoiceDraftSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Draft copy in your voice");
    assert.equal(step.primary.classification, "strategic");
    assert.match(step.primary.body, /Create a draft here/);
    assert.match(step.primary.body, /will not send email/);
    assert.match(page, /isDraftBrandVoiceNextStep/);
    assert.match(page, /BrandVoiceDraftForm/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/brand-voice/page.tsx"),
        "utf8",
      ),
      /BrandVoiceDraftForm/,
    );
  });

  it("keeps Draft copy in your voice on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          brandVoiceDraftSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsDraftBrandVoice, true);
    assert.match(page, /needsDraftBrandVoice/);
    assert.match(page, /!isDraftBrandVoiceNextStep/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/brand-voice/page.tsx"),
        "utf8",
      ),
      /BrandVoiceDraftForm/,
    );
  });

  it("keeps adding a brand voice example ahead of drafting copy", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          brandVoiceSaved: true,
          brandVoiceExampleSaved: false,
          brandVoiceDraftSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Add a brand voice example");
  });

  it("puts Add an offer on Next step when visits are recorded and none are confirmed yet", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          confirmedOfferCount: 0,
          recordedVisitCount: 1,
          brandVoiceSaved: false,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Add an offer");
    assert.equal(step.primary.classification, "strategic");
    assert.match(step.primary.body, /will not start marketing/);
    assert.match(page, /isAddOfferNextStep/);
    assert.match(page, /OfferCreateForm/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/offers/page.tsx"), "utf8"),
      /OfferCreateForm/,
    );
  });

  it("keeps Add an offer on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          confirmedOfferCount: 0,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsAddOffer, true);
    assert.match(page, /needsAddOffer/);
    assert.match(page, /!isAddOfferNextStep/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/offers/page.tsx"), "utf8"),
      /OfferCreateForm/,
    );
  });

  it("keeps sharing the lead form ahead of adding an offer", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          confirmedOfferCount: 0,
          recordedVisitCount: 1,
          openLeadCount: 0,
          contactCount: 0,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Share the public lead form");
  });

  it("puts Save your brand on Next step when visits are recorded but the brand is incomplete", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          brandSettingsSaved: false,
          confirmedOfferCount: 0,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Save your brand");
    assert.equal(step.primary.classification, "strategic");
    assert.match(step.primary.body, /will not start marketing/);
    assert.match(page, /isSaveBrandNextStep/);
    assert.match(page, /BrandSettingsForm/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/settings/brand/page.tsx"),
        "utf8",
      ),
      /BrandSettingsForm/,
    );
  });

  it("keeps Save your brand on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          brandSettingsSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsSaveBrand, true);
    assert.match(page, /needsSaveBrand/);
    assert.match(page, /!isSaveBrandNextStep/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/settings/brand/page.tsx"),
        "utf8",
      ),
      /BrandSettingsForm/,
    );
  });

  it("keeps sharing the lead form ahead of saving the brand", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          brandSettingsSaved: false,
          recordedVisitCount: 1,
          openLeadCount: 0,
          contactCount: 0,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Share the public lead form");
  });

  it("keeps saving the brand ahead of adding an offer", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          brandSettingsSaved: false,
          confirmedOfferCount: 0,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Save your brand");
  });

  it("puts Save how this business works on Next step after the brand is saved", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          businessBrainSaved: false,
          confirmedOfferCount: 0,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Save how this business works");
    assert.equal(step.primary.classification, "strategic");
    assert.match(step.primary.body, /will not start marketing/);
    assert.match(page, /isSaveBusinessNextStep/);
    assert.match(page, /BusinessBrainForm/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/business/page.tsx"),
        "utf8",
      ),
      /BusinessBrainForm/,
    );
  });

  it("keeps Save how this business works on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          businessBrainSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsSaveBusiness, true);
    assert.match(page, /needsSaveBusiness/);
    assert.match(page, /!isSaveBusinessNextStep/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/business/page.tsx"),
        "utf8",
      ),
      /BusinessBrainForm/,
    );
  });

  it("keeps sharing the lead form ahead of saving how the business works", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          businessBrainSaved: false,
          recordedVisitCount: 1,
          openLeadCount: 0,
          contactCount: 0,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Share the public lead form");
  });

  it("keeps saving how the business works ahead of adding an offer", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          businessBrainSaved: false,
          confirmedOfferCount: 0,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Save how this business works");
  });

  it("puts Save today's Goal number on Next step when a connected Goal has no history yet", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          goalProgressNeedsSave: true,
          brandSettingsSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Save today's Goal number");
    assert.equal(step.primary.classification, "strategic");
    assert.match(step.primary.body, /will not start marketing/);
    assert.match(page, /isSaveProgressNextStep/);
    assert.match(page, /SaveConnectedProgressButton/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/goals/page.tsx"), "utf8"),
      /SaveConnectedProgressButton/,
    );
  });

  it("lets the owner save today's Goal number on Next step after the first save", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const goals = readFileSync(
      join(process.cwd(), "src/app/(app)/app/goals/page.tsx"),
      "utf8",
    );
    const queries = readFileSync(
      join(process.cwd(), "src/lib/growth/queries.ts"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      readableGoal: {
        id: "goal-2",
        title: "More people get in touch",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "2 open leads from the public form.",
        progressPercent: 20,
        liveComputable: true,
      },
    });
    assert.equal(step.readableGoal?.liveComputable, true);
    assert.match(page, /liveComputable/);
    assert.match(page, /!isSaveProgressNextStep\(step\.primary\.title\)/);
    assert.match(page, /The Goal[\s\S]*SaveConnectedProgressButton/);
    assert.match(goals, /SaveConnectedProgressButton/);
    assert.match(goals, /or on Next step/);
    assert.match(queries, /liveComputable: Boolean/);
  });

  it("keeps sharing the lead form ahead of saving today's Goal number", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          goalProgressNeedsSave: true,
          recordedVisitCount: 1,
          openLeadCount: 0,
          contactCount: 0,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Share the public lead form");
  });

  it("puts Connect payments on Next step when Stripe is not marked connected", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          stripeConfigured: true,
          stripeConnected: false,
          brandSettingsSaved: false,
          goalProgressNeedsSave: true,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Connect payments");
    assert.equal(step.primary.classification, "optimization");
    assert.equal(step.primary.href, "/app/next-step");
    assert.match(step.primary.body, /Connect here/);
    assert.match(step.primary.body, /will not charge a card/);
    assert.match(step.primary.body, /change checkout/);
    assert.match(page, /isStripeReadCopyNextStep/);
    assert.match(page, /StripeReadCopyPanel/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/commerce/page.tsx"), "utf8"),
      /StripeReadCopyPanel/,
    );
  });

  it("keeps Connect payments on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          stripeConfigured: true,
          stripeConnected: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsStripeReadCopy, true);
    assert.match(page, /needsStripeReadCopy/);
    assert.match(page, /!isStripeReadCopyNextStep/);
    assert.match(
      readFileSync(join(process.cwd(), "src/app/(app)/app/commerce/page.tsx"), "utf8"),
      /StripeReadCopyPanel/,
    );
  });

  it("keeps sharing the lead form ahead of connecting payments", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          stripeConfigured: true,
          stripeConnected: false,
          recordedVisitCount: 1,
          openLeadCount: 0,
          contactCount: 0,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Share the public lead form");
  });

  it("keeps following up open leads ahead of connecting payments", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          stripeConfigured: true,
          stripeConnected: false,
          recordedVisitCount: 1,
          openLeadCount: 2,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Follow up open leads");
  });

  it("keeps pasting the tracking snippet ahead of connecting payments", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          stripeConfigured: true,
          stripeConnected: false,
          recordedVisitCount: 0,
          openLeadCount: 0,
          contactCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Paste the tracking snippet");
  });

  it("puts Sync recent payments on Next step when Stripe is connected but never synced", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          stripeConfigured: true,
          stripeConnected: true,
          stripeSynced: false,
          brandSettingsSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Sync recent payments");
    assert.equal(step.primary.classification, "optimization");
    assert.match(step.primary.body, /Copy recent payment records here/);
    assert.match(step.primary.body, /will not charge a card/);
  });

  it("puts Choose when you look at growth on Next step when the schedule has never been saved", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          growthScheduleSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Choose when you look at growth");
    assert.equal(step.primary.classification, "strategic");
    assert.equal(step.primary.href, "/app/next-step");
    assert.match(step.primary.body, /here/);
    assert.match(step.primary.body, /will not change the business/);
    assert.match(page, /isSaveReviewScheduleNextStep/);
    assert.match(page, /GrowthSettingsForm/);
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), "src/app/(app)/app/goals/page.tsx"), "utf8"),
      /GrowthSettingsForm/,
    );
  });

  it("keeps Choose when you look at growth on Next step when it is not the main ask", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 1,
      reports: buildSpecialistReports(
        facts({
          inferredDraftCount: 1,
          growthScheduleSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Confirm or reject what GroovGro drafted");
    assert.equal(step.needsSaveReviewSchedule, true);
    assert.match(page, /needsSaveReviewSchedule/);
    assert.match(page, /!isSaveReviewScheduleNextStep/);
    assert.match(
      readFileSync(
        join(process.cwd(), "src/app/(app)/app/growth-review/page.tsx"),
        "utf8",
      ),
      /GrowthSettingsForm/,
    );
  });

  it("keeps connecting payments ahead of choosing when you look at growth", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          stripeConfigured: true,
          stripeConnected: false,
          growthScheduleSaved: false,
          recordedVisitCount: 1,
        }),
      ),
      waitingActions: [],
      websiteConnected: true,
      websiteRead: true,
    });
    assert.equal(step.primary.title, "Connect payments");
  });

  it("puts Add event on Next step when the schedule needs a review", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const eventsPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/events/page.tsx"),
      "utf8",
    );
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(
        facts({
          goals: [
            {
              id: "g-util",
              title: "Fill upcoming scheduled spots",
              status: "active",
              goalType: "utilization",
              liveCurrentValue: 0,
              targetValue: 12,
              progressPercent: 0,
              liveNote: "0 of 12 upcoming spots are filled.",
            },
          ],
          upcomingEventCount: 2,
          evidenceSample: { elapsedDays: 30, observations: 40, conversions: 12 },
          openLeadCount: 0,
          searchConsoleConnected: true,
          recordedVisitCount: 1,
          brandVoiceSaved: false,
        }),
      ),
      waitingActions: [],
    });
    assert.equal(step.primary.title, "Review the schedule or how people find it");
    assert.match(step.primary.body, /Review upcoming items here/);
    assert.match(page, /isReviewScheduleNextStep/);
    assert.match(page, /EventCreateForm/);
    assert.match(eventsPage, /EventCreateForm/);
  });

  it("asks the Dashboard to propose first actions on Next step", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(app)/app/page.tsx"),
      "utf8",
    );
    assert.match(source, /Propose the first actions on Next step/);
    assert.match(source, /Open Next step to do it/);
    assert.match(source, /Open Next step to write the first measurable outcome/);
    assert.doesNotMatch(source, /Open Next step or Goals/);
    assert.doesNotMatch(source, /Propose the first actions there/);
    assert.match(source, /Open Next step to connect so GroovGro can read a copy of payments/);
    assert.match(source, /Open Next step to confirm or reject what GroovGro drafted/);
    assert.match(source, /Open Next step to copy the public form or add a/);
    assert.match(source, /Open Next step to add a calendar item/);
    assert.match(source, /Open Next step to see this week/);
    assert.doesNotMatch(source, /Open Growth review to see this week/);
    assert.doesNotMatch(source, /Use Leads & customers or the public form/);
    assert.doesNotMatch(source, /Add a class, workshop, or appointment/);
    assert.doesNotMatch(source, /Open Bookings & payments and connect Stripe/);
    assert.doesNotMatch(source, /Open Business to confirm or reject/);
    assert.match(
      source,
      /website_connect[\s\S]*?<Button asChild variant="outline">\s*<Link href="\/app\/next-step">Connect website<\/Link>/,
    );
    assert.match(
      source,
      /growth_next[\s\S]*?<Button asChild>\s*<Link href="\/app\/next-step">Next step<\/Link>/,
    );
    assert.match(source, /href="\/app\/intelligence">Intelligence<\/Link>/);
    assert.doesNotMatch(source, /Intelligence and specialists/);
    assert.match(source, /Read\s+the path so far on Next step/);
    assert.doesNotMatch(source, /GrowthStoryCard/);
    assert.doesNotMatch(source, /ReviewConnectedDataButton/);
  });

  it("keeps the owner on Next step instead of a second Open Website or Open SEO button", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const connectForm = readFileSync(
      join(process.cwd(), "src/components/website-connect-form.tsx"),
      "utf8",
    );
    const actions = readFileSync(
      join(process.cwd(), "src/components/next-step-actions.tsx"),
      "utf8",
    );
    const workButtons = readFileSync(
      join(process.cwd(), "src/components/owner-work-actions.tsx"),
      "utf8",
    );
    assert.doesNotMatch(page, /<Link href="\/app\/website">Open Website<\/Link>/);
    assert.doesNotMatch(page, /<Link href="\/app\/seo">Open SEO<\/Link>/);
    assert.doesNotMatch(page, /<Link href="\/app\/crm">Open Leads/);
    assert.doesNotMatch(page, /<Link href="\/app\/events">Open Events<\/Link>/);
    assert.doesNotMatch(page, /<Link href="\/app\/commerce">Open Bookings/);
    assert.doesNotMatch(page, /Open SEO to finish Search Console/);
    assert.doesNotMatch(page, /Open Leads & customers to copy the public form/);
    assert.match(page, /showOpenPage=\{false\}/);
    assert.match(connectForm, /Copy the tracking snippet on Next step next/);
    assert.match(actions, /href !== "\/app\/next-step"/);
    assert.match(workButtons, /Open Next step/);
  });

  it("puts the growth review schedule on Growth review instead of sending the owner to Goals", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/growth-review/page.tsx"),
      "utf8",
    );
    assert.match(page, /GrowthSettingsForm/);
    assert.match(page, /href="\/app\/next-step">Open Next step/);
    assert.match(page, /Read this week/);
    assert.match(page, /on Next step/);
    assert.doesNotMatch(page, /Change the schedule/);
    assert.doesNotMatch(page, /href="\/app\/goals"/);
    assert.doesNotMatch(page, /A weekly look at progress, and a monthly look/);
    assert.doesNotMatch(page, /review=\{snapshot\.weeklyReview\}/);
    assert.match(page, /snapshot\.monthlyReview/);
    assert.doesNotMatch(page, /lg:grid-cols-2/);
  });

  it("keeps Goals, Growth review, and Your work from sending the owner away for Next step content", () => {
    const goals = readFileSync(
      join(process.cwd(), "src/app/(app)/app/goals/page.tsx"),
      "utf8",
    );
    const review = readFileSync(
      join(process.cwd(), "src/app/(app)/app/growth-review/page.tsx"),
      "utf8",
    );
    const work = readFileSync(
      join(process.cwd(), "src/app/(app)/app/work/page.tsx"),
      "utf8",
    );
    assert.match(goals, /href="\/app\/next-step">Open Next step/);
    assert.match(goals, /href="\/app\/growth-review">Open growth review/);
    assert.match(goals, /make it the active Goal on Next step/);
    assert.match(goals, /Make this the active Goal on Next step/);
    assert.match(goals, /Draft the next Goal on Next step/);
    assert.match(goals, /Draft a plan on Next step/);
    assert.match(goals, /Draft a plan for this Goal on Next step/);
    assert.match(goals, /Approve or reject\s+proposed\s+actions on Next\s+step/);
    assert.match(goals, /Approve or reject that plan on Next step/);
    assert.match(goals, /Approve or reject this plan on Next step/);
    assert.match(goals, /Propose the first actions on Next step/);
    assert.match(goals, /Do\s+approved work on Next step or\s+Your\s+work/);
    assert.match(goals, /Confirm or\s+reject\s+suggested goals on Next step/);
    assert.match(goals, /Confirm or reject this on Next step/);
    assert.match(goals, /Review connected data on Next step/);
    assert.doesNotMatch(goals, /WaitingActionButtons/);
    assert.doesNotMatch(goals, /OwnerWorkButtons/);
    assert.doesNotMatch(goals, /ConfirmRejectButtons/);
    assert.doesNotMatch(goals, /GrowthSettingsForm/);
    assert.doesNotMatch(goals, /ReviewConnectedDataButton/);
    assert.doesNotMatch(goals, /GrowthPlanReviewButtons/);
    assert.doesNotMatch(goals, /ProposePlanActionsButton/);
    assert.doesNotMatch(goals, /ActivateGoalButton/);
    assert.doesNotMatch(goals, /DraftNextGoalButton/);
    assert.doesNotMatch(goals, /DraftGrowthPlanButton/);
    assert.doesNotMatch(goals, /click Draft a plan for this Goal/);
    assert.doesNotMatch(goals, /on a Goal above/);
    const offers = readFileSync(
      join(process.cwd(), "src/app/(app)/app/offers/page.tsx"),
      "utf8",
    );
    assert.match(offers, /Confirm or reject suggested offers on Next step/);
    assert.match(offers, /Confirm or reject this on Next step/);
    assert.match(offers, /Review connected data on Next step when/);
    assert.doesNotMatch(offers, /ConfirmRejectButtons/);
    assert.doesNotMatch(offers, /ReviewConnectedDataButton/);
    const drafts = readFileSync(
      join(process.cwd(), "src/components/growth-review.tsx"),
      "utf8",
    );
    assert.match(drafts, /Confirm or reject this on Next step/);
    assert.doesNotMatch(drafts, /ConfirmRejectButtons id=/);
    assert.doesNotMatch(goals, /href="\/app\/intelligence"/);
    assert.doesNotMatch(goals, /href="\/app\/decisions"/);
    assert.doesNotMatch(goals, /Read the path so far/);
    assert.match(review, /href="\/app\/next-step">Open Next step/);
    assert.doesNotMatch(review, /href="\/app\/intelligence"/);
    assert.doesNotMatch(review, /href="\/app\/decisions"/);
    assert.match(work, /href="\/app\/next-step">Open Next step/);
    assert.match(work, /Approve or reject these on Next step/);
    assert.doesNotMatch(work, /WaitingActionButtons/);
    assert.doesNotMatch(work, /href="\/app\/decisions"/);
    assert.doesNotMatch(work, /The path so far/);
  });

  it("asks Intelligence and empty Goals plans to name Next step for specialists and drafting", () => {
    const intelligence = readFileSync(
      join(process.cwd(), "src/app/(app)/app/intelligence/page.tsx"),
      "utf8",
    );
    const goals = readFileSync(
      join(process.cwd(), "src/app/(app)/app/goals/page.tsx"),
      "utf8",
    );
    assert.match(intelligence, /Read specialists and save them on Next/);
    assert.match(intelligence, /This page is the briefing from connected/);
    assert.doesNotMatch(intelligence, /SpecialistReports/);
    assert.doesNotMatch(intelligence, /now including specialists linked to/);
    assert.match(goals, /Open Next step when it asks you to draft a plan/);
  });

  it("offers Next step from Website, Leads, Bookings, and the other owner pages", () => {
    const link = readFileSync(
      join(process.cwd(), "src/components/open-next-step-link.tsx"),
      "utf8",
    );
    assert.match(link, /href="\/app\/next-step"/);
    assert.match(link, /Open Next step/);
    for (const file of [
      "src/app/(app)/app/website/page.tsx",
      "src/app/(app)/app/crm/page.tsx",
      "src/app/(app)/app/commerce/page.tsx",
      "src/app/(app)/app/seo/page.tsx",
      "src/app/(app)/app/brand-voice/page.tsx",
      "src/app/(app)/app/business/page.tsx",
      "src/app/(app)/app/events/page.tsx",
      "src/app/(app)/app/offers/page.tsx",
      "src/app/(app)/app/growth-review/page.tsx",
      "src/app/(app)/app/intelligence/page.tsx",
      "src/app/(app)/app/decisions/page.tsx",
      "src/app/(app)/app/settings/page.tsx",
      "src/app/(app)/app/settings/brand/page.tsx",
      "src/app/(app)/app/settings/team/page.tsx",
      "src/app/(app)/app/media/page.tsx",
      "src/app/(app)/app/integrations/page.tsx",
      "src/app/(app)/app/marketing/page.tsx",
      "src/app/(app)/app/analytics/page.tsx",
      "src/app/(app)/app/notifications/page.tsx",
      "src/app/(app)/app/audit/page.tsx",
    ]) {
      const page = readFileSync(join(process.cwd(), file), "utf8");
      assert.match(page, /OpenNextStepLink/, file);
    }
    const website = readFileSync(
      join(process.cwd(), "src/app/(app)/app/website/page.tsx"),
      "utf8",
    );
    assert.match(website, /open Next step to find\s+pages/);
    assert.match(website, /Find pages and check the important ones on Next step/);
    assert.doesNotMatch(website, /WebsitePageChecklist/);
    assert.doesNotMatch(website, /open Business and click Review/);
    const business = readFileSync(
      join(process.cwd(), "src/app/(app)/app/business/page.tsx"),
      "utf8",
    );
    assert.match(business, /Save a website address on Next step first/);
    assert.match(business, /Find pages and check the\s+important ones on Next step/);
    assert.match(business, /Find pages and check the important ones on Next step/);
    assert.doesNotMatch(business, /WebsitePageChecklist/);
    assert.doesNotMatch(business, /Then you can find\s+pages here/);
    assert.match(business, /Confirm\s+or reject suggested drafts on Next step/);
    assert.match(business, /Confirm or reject on Next step/);
    assert.match(business, /ReviewConnectedDataButton/);
    assert.doesNotMatch(business, /ConfirmRejectButtons/);
    assert.doesNotMatch(business, /on Website first/);
    assert.doesNotMatch(business, /href="\/app\/goals"/);
    const goalsPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/goals/page.tsx"),
      "utf8",
    );
    assert.match(goalsPage, /Open Next step to\s+read this week/);
    assert.match(goalsPage, /Choose when you look\s+at this week/);
    assert.doesNotMatch(goalsPage, /GrowthSettingsForm/);
    assert.doesNotMatch(goalsPage, /Open Growth review\s+to read the current weekly/);
    const decisions = readFileSync(
      join(process.cwd(), "src/app/(app)/app/decisions/page.tsx"),
      "utf8",
    );
    assert.match(decisions, /Save this week/);
    assert.match(decisions, /from Next step/);
    assert.match(decisions, /Recent decisions also appear on Next step/);
    assert.match(decisions, /Read the path so far on\s+Next step/);
    assert.match(decisions, /Approve or reject proposed actions on Next step/);
    assert.doesNotMatch(decisions, /WaitingActionButtons/);
    assert.doesNotMatch(decisions, /GrowthStoryCard/);
    assert.doesNotMatch(decisions, /saved\s+here from Growth review/);
  });

  it("asks website setup click-by-click to find pages and review on Next step", () => {
    const setup = readFileSync(
      join(process.cwd(), "docs/phase-2/USER_SETUP.md"),
      "utf8",
    );
    assert.match(setup, /Open \*\*Next step\*\*\. Click \*\*Find pages\*\*/);
    assert.match(setup, /then click \*\*Review connected data\*\*/);
    assert.doesNotMatch(
      setup,
      /open \*\*Business\*\* and click \*\*Review connected data\*\*/,
    );
  });

  it("keeps confirm drafts, review site, owner work, and wait on Next step", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /href: "\/app\/business"/);
    assert.doesNotMatch(source, /href: "\/app\/website"/);
    assert.doesNotMatch(source, /href: "\/app\/work"/);
    assert.doesNotMatch(source, /href: "\/app\/growth-review"/);
    assert.doesNotMatch(source, /href: "\/app\/goals"/);
    const goals = readFileSync(
      join(process.cwd(), "src/app/(app)/app/goals/page.tsx"),
      "utf8",
    );
    assert.match(goals, /Open Next step/);
  });

  it("keeps Next step from sending the owner to Your work", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(page, /href="\/app\/goals">Open Goals/);
    assert.doesNotMatch(page, /label="Open Goals"/);
    assert.doesNotMatch(page, /href="\/app\/goals">Goals/);
    assert.doesNotMatch(page, /href="\/app\/growth-review"/);
    assert.doesNotMatch(page, /href="\/app\/work"/);
    assert.doesNotMatch(page, /href="\/app\/intelligence"/);
    assert.doesNotMatch(page, /href="\/app\/decisions"/);
    assert.doesNotMatch(page, /href="\/app">The path so far/);
    assert.doesNotMatch(page, /Open Your work/);
    assert.match(page, /LeaveAloneNextStepButton/);
    assert.match(page, /weeklyLook/);
  });

  it("lets the owner read the Growth Plan on Next step", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      readablePlan: {
        id: "plan-2",
        goalId: "goal-2",
        goalTitle: "More people get in touch",
        version: 2,
        status: "approved",
        strategySummary: "Follow up open leads. GroovGro will not run this.",
      },
    });
    assert.equal(step.readablePlan?.id, "plan-2");
    assert.equal(step.readablePlan?.goalTitle, "More people get in touch");
    assert.match(step.readablePlan?.strategySummary ?? "", /will not run this/);
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(page, /step\.readablePlan/);
    assert.match(page, /strategySummary/);
    assert.match(page, /Read it here/);
    assert.doesNotMatch(page, /href="\/app\/goals">Open Goals/);
  });

  it("lets the owner read the Goal on Next step", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      readableGoal: {
        id: "goal-2",
        title: "More people get in touch",
        liveCurrentValue: 2,
        targetValue: 10,
        unit: "leads",
        liveNote: "2 open leads from the public form.",
        progressPercent: 20,
        liveComputable: true,
        progressHistory: [
          {
            id: "snap-1",
            recordedAtLabel: "8/17/2026",
            value: 2,
            source: "connected",
            note: "from the public form",
          },
        ],
      },
    });
    assert.equal(step.readableGoal?.id, "goal-2");
    assert.equal(step.readableGoal?.title, "More people get in touch");
    assert.equal(step.readableGoal?.liveCurrentValue, 2);
    assert.equal(step.readableGoal?.liveComputable, true);
    assert.equal(step.readableGoal?.progressHistory?.[0]?.value, 2);
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const goals = readFileSync(
      join(process.cwd(), "src/app/(app)/app/goals/page.tsx"),
      "utf8",
    );
    const queries = readFileSync(
      join(process.cwd(), "src/lib/growth/queries.ts"),
      "utf8",
    );
    assert.match(page, /step\.readableGoal/);
    assert.match(page, /<CardTitle>The Goal<\/CardTitle>/);
    assert.match(page, /GoalReadout/);
    assert.match(page, /Saved progress/);
    assert.match(page, /progressHistory/);
    assert.match(page, /Read the number and saved history here/);
    assert.doesNotMatch(page, /href="\/app\/goals">Open Goals/);
    assert.match(goals, /Saved progress/);
    assert.match(queries, /toReadableGoal/);
    assert.match(queries, /progressHistory/);
  });

  it("lets the owner read this week’s look on Next step", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      weeklyLook: {
        periodLabel: "Week of Aug 17, 2026",
        headline: "Keep collecting evidence.",
        summary: "No active Goal yet.",
        whatChanged: "No Goal number moved this week.",
        howWeAreDoing: "No active Goal yet. Open Next step to add one.",
        whatNeedsAttention: "There is no active Goal. Open Next step to add one.",
        whatShouldHappenNext: "Open Next step to add a measurable Goal.",
        whatIsLeftAlone: "Ads, email, and social stay left alone.",
        strategyNote: "Wait for a Goal before changing course.",
        recommendations: [
          {
            title: "Add a Goal",
            recommendation: "Open Next step to add a measurable Goal.",
            rationale: "Reviews need a number to compare.",
            evidence: "No active Goal is stored.",
            kind: "recommend",
            classification: "operational",
            confidence: 80,
          },
        ],
        evidenceChecks: [
          {
            channel: "seo",
            verdict: "no_change_yet",
            reason: "Not enough new Search Console rows yet.",
          },
        ],
      },
    });
    assert.equal(step.weeklyLook?.periodLabel, "Week of Aug 17, 2026");
    assert.match(step.weeklyLook?.headline ?? "", /Keep collecting evidence/);
    assert.match(step.weeklyLook?.whatShouldHappenNext ?? "", /add a measurable Goal/);
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const review = readFileSync(
      join(process.cwd(), "src/app/(app)/app/growth-review/page.tsx"),
      "utf8",
    );
    assert.match(page, /step\.weeklyLook/);
    assert.match(page, /This week/);
    assert.match(page, /GrowthReviewBody/);
    assert.match(page, /This week[\s\S]*SaveGrowthReviewButton/);
    assert.doesNotMatch(page, /href="\/app\/growth-review"/);
    assert.match(review, /snapshot\.monthlyReview/);
    assert.doesNotMatch(review, /review=\{snapshot\.weeklyReview\}/);
  });

  it("lets the owner read and save specialists on Next step", () => {
    const reports = buildSpecialistReports(facts());
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports,
      waitingActions: [],
    });
    assert.equal(step.reports.length, reports.length);
    assert.ok(step.reports.some((row) => row.id === "seo"));
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const specialists = readFileSync(
      join(process.cwd(), "src/components/specialist-reports.tsx"),
      "utf8",
    );
    const intelligence = readFileSync(
      join(process.cwd(), "src/app/(app)/app/intelligence/page.tsx"),
      "utf8",
    );
    assert.match(page, /SpecialistReports/);
    assert.match(page, /hideNextStepLink/);
    assert.match(page, /step\.reports/);
    assert.doesNotMatch(page, /href="\/app\/intelligence"/);
    assert.doesNotMatch(intelligence, /SpecialistReports/);
    assert.match(specialists, /Save to Decision History/);
    assert.match(specialists, /hideNextStepLink/);
    assert.match(specialists, /Open related page/);
  });

  it("lets the owner read Decision History on Next step", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      readableDecisions: [
        {
          id: "decision-1",
          decisionType: "no_change",
          recommendation: "Leave SEO alone this period.",
          rationale: "There is not enough evidence to change SEO.",
          outcome: "",
          evidenceWindow: "specialist read / analyze / recommend",
          confidence: 85,
          createdAtLabel: "Aug 24, 2026",
        },
      ],
    });
    assert.equal(step.readableDecisions.length, 1);
    assert.equal(step.readableDecisions[0]?.id, "decision-1");
    assert.match(step.readableDecisions[0]?.recommendation ?? "", /Leave SEO alone/);
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(page, /step\.readableDecisions/);
    assert.match(page, /Decision History/);
    assert.doesNotMatch(page, /href="\/app\/decisions"/);
  });

  it("lets the owner read The path so far on Next step", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      finishedWorkCount: 2,
      latestLearning: "The Goal number did not move. Stay the course.",
    });
    assert.equal(step.finishedWorkCount, 2);
    assert.match(step.latestLearning, /Stay the course/);
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const story = readFileSync(
      join(process.cwd(), "src/components/growth-story.tsx"),
      "utf8",
    );
    assert.match(page, /GrowthStoryCard/);
    assert.match(page, /hideNextStepLink/);
    assert.match(page, /storyBeats/);
    assert.doesNotMatch(page, /href="\/app">The path so far/);
    assert.match(story, /hideNextStepLink/);
    assert.match(story, /The path so far/);
    const dashboard = readFileSync(
      join(process.cwd(), "src/app/(app)/app/page.tsx"),
      "utf8",
    );
    const decisions = readFileSync(
      join(process.cwd(), "src/app/(app)/app/decisions/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(dashboard, /GrowthStoryCard/);
    assert.doesNotMatch(decisions, /GrowthStoryCard/);
  });

  it("refreshes Next step after someone submits the public lead form", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/actions/public-lead.ts"),
      "utf8",
    );
    assert.match(source, /revalidatePath\("\/app\/next-step"\)/);
    assert.match(source, /revalidatePath\("\/app\/crm"\)/);
  });

  it("refreshes Next step after the first recorded website visit", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/track/route.ts"),
      "utf8",
    );
    assert.match(source, /firstVisit/);
    assert.match(source, /revalidatePath\("\/app\/next-step"\)/);
    assert.match(source, /revalidatePath\("\/app"\)/);
  });

  it("refreshes Next step after GroovGro records a new Stripe payment copy", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/stripe/webhook/route.ts"),
      "utf8",
    );
    assert.match(source, /result\.created/);
    assert.match(source, /revalidatePath\("\/app\/next-step"\)/);
    assert.match(source, /revalidatePath\("\/app\/crm"\)/);
    assert.doesNotMatch(source, /stripe-osa/);
  });
});
