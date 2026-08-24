import type { WorkLearningKind } from "@/lib/growth/work-learning";
import type { SpecialistId, SpecialistReport } from "@/lib/growth/specialists";
import { APPROVE_PLAN_STEP_TITLE, DRAFT_PLAN_STEP_TITLE } from "@/lib/growth/plan-draft";

const DISCONNECTED_CHANNELS = new Set<SpecialistId>(["advertising", "email", "social"]);

export type NextStepKind = "no_change_yet" | "recommend";
export type NextStepClass = "operational" | "optimization" | "strategic";
export type NextStepSource = "drafts" | "specialist" | "review" | "owner_work" | "learning" | "goals";

export type NextStepCandidate = {
  kind: NextStepKind
  classification: NextStepClass
  title: string
  body: string
  href: string
  source: NextStepSource
  specialistId: SpecialistId | null
  goalId: string | null
  planId?: string | null
};

export type WaitingAction = {
  id: string
  description: string
  module: string
  status: string
  risk: string
};

export type NextStepInput = {
  inferredDraftCount: number
  reports: SpecialistReport[]
  waitingActions: WaitingAction[]
  openWorkCount?: number
  latestLearningKind?: WorkLearningKind | ""
  latestLearningOutcome?: string
  latestLearningGoalId?: string | null
  activateGoalId?: string | null
  activateGoalTitle?: string
  planGoalId?: string | null
  planGoalTitle?: string
  approvePlanId?: string | null
  approvePlanGoalId?: string | null
  approvePlanGoalTitle?: string
  approvePlanVersion?: number
  approvePlanExcerpt?: string
  activeGoalIds?: string[]
};

export type CoordinatedNextStep = {
  primary: NextStepCandidate
  leftAlone: NextStepCandidate[]
  waitingActions: WaitingAction[]
  executeAllowed: false
};

function score(candidate: NextStepCandidate): number {
  if (candidate.kind === "no_change_yet") return 0;
  if (candidate.classification === "operational") return 80;
  if (candidate.classification === "optimization") return 40;
  return 10;
}

function draftsCandidate(count: number): NextStepCandidate | null {
  if (count <= 0) return null;
  return {
    kind: "recommend",
    classification: "operational",
    title: "Confirm or reject what GroovGro drafted",
    body: `${count} suggested offer${count === 1 ? "" : "s or goals"} still need you to confirm or reject. Nothing becomes active until you do. GroovGro will not start marketing.`,
    href: "/app/business",
    source: "drafts",
    specialistId: null,
    goalId: null,
  };
}

function fromReport(report: SpecialistReport): NextStepCandidate {
  return {
    kind: report.recommend.kind,
    classification: report.recommend.classification,
    title: report.recommend.title,
    body: report.recommend.body,
    href: report.recommend.href,
    source: "specialist",
    specialistId: report.id,
    goalId: report.relatedGoal?.id ?? null,
  };
}

function activateGoalCandidate(
  goalId: string | null | undefined,
  title: string | undefined,
): NextStepCandidate | null {
  if (!goalId) return null;
  const name = (title ?? "").replace(/\s+/g, " ").trim() || "the next Goal";
  return {
    kind: "recommend",
    classification: "operational",
    title: "Make this the active Goal",
    body: `“${name}” is a draft. Make it the active Goal when you want GroovGro to follow it. GroovGro will not start marketing.`,
    href: "/app/goals",
    source: "goals",
    specialistId: null,
    goalId,
  };
}

function draftPlanCandidate(
  goalId: string | null | undefined,
  title: string | undefined,
): NextStepCandidate | null {
  if (!goalId) return null;
  const name = (title ?? "").replace(/\s+/g, " ").trim() || "this Goal";
  return {
    kind: "recommend",
    classification: "operational",
    title: DRAFT_PLAN_STEP_TITLE,
    body: `“${name}” is the active Goal. Draft a plan so GroovGro can propose the first actions. GroovGro will not run it.`,
    href: "/app/goals",
    source: "goals",
    specialistId: null,
    goalId,
  };
}

function approvePlanCandidate(input: NextStepInput): NextStepCandidate | null {
  if (!input.approvePlanId) return null;
  const name =
    (input.approvePlanGoalTitle ?? "").replace(/\s+/g, " ").trim() || "this Goal";
  const version = input.approvePlanVersion;
  const versionLabel = version != null ? ` v${version}` : "";
  const excerpt = (input.approvePlanExcerpt ?? "").replace(/\s+/g, " ").trim();
  const intro = `“${name}” has draft plan${versionLabel} waiting. Approve or reject it. Approving does not run marketing.`;
  return {
    kind: "recommend",
    classification: "operational",
    title: APPROVE_PLAN_STEP_TITLE,
    body: excerpt ? `${intro} ${excerpt}` : intro,
    href: "/app/goals",
    source: "goals",
    specialistId: null,
    goalId: input.approvePlanGoalId ?? null,
    planId: input.approvePlanId,
  };
}

function ownerWorkCandidate(count: number): NextStepCandidate | null {
  if (count <= 0) return null;
  return {
    kind: "recommend",
    classification: "operational",
    title: "Do the work you already approved",
    body: `${count} approved action${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} ready on Your work. You do ${count === 1 ? "it" : "them"}. GroovGro will not run ${count === 1 ? "it" : "them"}.`,
    href: "/app/work",
    source: "owner_work",
    specialistId: null,
    goalId: null,
  };
}

function learningCandidate(input: NextStepInput): NextStepCandidate | null {
  const kind = input.latestLearningKind;
  if (!kind) return null;
  const outcome = (input.latestLearningOutcome ?? "").replace(/\s+/g, " ").trim();
  const goalId = input.latestLearningGoalId ?? null;
  const leaveAlone =
    " GroovGro will not start ads, send email, or change the live website.";

  if (kind === "target_reached") {
    const stillActive =
      !input.activeGoalIds?.length ||
      (input.latestLearningGoalId != null &&
        input.activeGoalIds.includes(input.latestLearningGoalId));
    if (!stillActive) return null;
    return {
      kind: "recommend",
      classification: "operational",
      title: "This Goal is reached",
      body:
        outcome ||
        `The Goal number reached its target. Draft the next Goal, then set it to Active when you want it.${leaveAlone}`,
      href: "/app/goals",
      source: "learning",
      specialistId: null,
      goalId,
    };
  }
  if (kind === "declined") {
    return {
      kind: "recommend",
      classification: "operational",
      title: "Read the Goal before changing course",
      body:
        outcome ||
        `The Goal number is lower than when you did the work. Do not add spend.${leaveAlone}`,
      href: "/app/goals",
      source: "learning",
      specialistId: null,
      goalId,
    };
  }
  if (kind === "no_goal") {
    return {
      kind: "recommend",
      classification: "operational",
      title: "Add a Goal so GroovGro can compare a number",
      body:
        outcome ||
        `That work was not tied to a Goal. Open Goals and write a measurable outcome.${leaveAlone}`,
      href: "/app/goals",
      source: "learning",
      specialistId: null,
      goalId,
    };
  }

  return {
    kind: "no_change_yet",
    classification: "optimization",
    title: "Nothing should change yet",
    body:
      outcome ||
      `Keep collecting evidence. Do not change course yet.${leaveAlone}`,
    href: "/app/work",
    source: "learning",
    specialistId: null,
    goalId,
  };
}

function nothingYet(): NextStepCandidate {
  return {
    kind: "no_change_yet",
    classification: "optimization",
    title: "Nothing should change yet",
    body: "Keep collecting evidence from the connected website, leads, and payments. GroovGro will not start ads, send email, or change the live site.",
    href: "/app/growth-review",
    source: "review",
    specialistId: null,
    goalId: null,
  };
}

export function isWaitingActionStatus(status: string): boolean {
  return status === "proposed" || status === "awaiting_approval";
}

export function coordinateNextStep(input: NextStepInput): CoordinatedNextStep {
  const waitingActions = input.waitingActions.filter((action) =>
    isWaitingActionStatus(action.status),
  );
  const drafts = draftsCandidate(input.inferredDraftCount);
  const ownerWork = ownerWorkCandidate(input.openWorkCount ?? 0);
  const activate = activateGoalCandidate(input.activateGoalId, input.activateGoalTitle);
  const draftPlan = draftPlanCandidate(input.planGoalId, input.planGoalTitle);
  const approvePlan = approvePlanCandidate(input);
  const learning = learningCandidate(input);
  const usable = input.reports.filter((report) => !DISCONNECTED_CHANNELS.has(report.id));
  const leftAlone = [
    ...input.reports.filter((report) => DISCONNECTED_CHANNELS.has(report.id)).map(fromReport),
    ...usable.filter((report) => report.recommend.kind === "no_change_yet").map(fromReport),
  ];

  const ranked = [
    ...usable.filter((report) => report.recommend.kind === "recommend").map(fromReport),
  ].sort((a, b) => score(b) - score(a));

  return {
    primary: drafts ?? ownerWork ?? activate ?? draftPlan ?? approvePlan ?? learning ?? ranked[0] ?? nothingYet(),
    leftAlone,
    waitingActions,
    executeAllowed: false,
  };
}
