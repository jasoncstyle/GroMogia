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
    searchConsoleConnected: false,
    openLeadCount: 0,
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
    assert.equal(step.primary.href, "/app/business");
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
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [],
    });
    assert.equal(step.primary.href, "/app/crm");
    assert.match(step.primary.title, /leads/i);
    assert.equal(
      step.leftAlone.some((item) => /ads/i.test(item.title) || /advertising/i.test(item.body)),
      true,
    );
  });

  it("says nothing should change when evidence is thin and work is current", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
    });
    assert.equal(step.primary.kind, "no_change_yet");
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
    assert.equal(step.primary.href, "/app/work");
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
    assert.equal(step.primary.href, "/app/business");
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
    assert.equal(step.primary.href, "/app/goals");
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
    assert.equal(step.primary.href, "/app/business");
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

  it("points at Goals when learning says the target was reached", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
      latestLearningKind: "target_reached",
      latestLearningOutcome: "The Goal reached its target. GroovGro will not start a new campaign.",
      latestLearningGoalId: "goal-1",
    });
    assert.equal(step.primary.href, "/app/goals");
    assert.equal(step.primary.source, "learning");
    assert.match(step.primary.body, /will not start a new campaign/);
  });

  it("does not bake industry-specific words into the coordinator", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/next-step.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });

  it("puts Open the page, I did this, and Skip on Next step for approved work", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(source, /OwnerWorkButtons/);
    assert.match(source, /OWNER_WORK_STEP_TITLE/);
    assert.match(source, /hrefForGrowthAction/);
  });

  it("puts Check what changed on Next step for finished work", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(source, /CheckWhatChangedButton/);
    assert.match(source, /CHECK_CHANGED_STEP_TITLE/);
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
});
