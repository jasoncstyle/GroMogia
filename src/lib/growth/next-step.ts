import type { WorkLearningKind } from "@/lib/growth/work-learning";
import type { SpecialistId, SpecialistReport } from "@/lib/growth/specialists";
import { ACTIVATE_GOAL_STEP_TITLE, ADD_GOAL_STEP_TITLE, APPROVE_ACTIONS_STEP_TITLE, APPROVE_PLAN_STEP_TITLE, CHECK_CHANGED_STEP_TITLE, CONFIRM_DRAFTS_STEP_TITLE, CONNECT_STRIPE_STEP_TITLE, DRAFT_PLAN_STEP_TITLE, GOAL_REACHED_STEP_TITLE, OWNER_WORK_STEP_TITLE, PASTE_SNIPPET_STEP_TITLE, PROPOSE_ACTIONS_STEP_TITLE, READ_GOAL_STEP_TITLE, REVIEW_SITE_STEP_TITLE, SAVE_BRAND_STEP_TITLE, SAVE_BUSINESS_STEP_TITLE, SHARE_LEAD_FORM_STEP_TITLE, SYNC_STRIPE_STEP_TITLE } from "@/lib/growth/plan-draft";

const DISCONNECTED_CHANNELS = new Set<SpecialistId>(["advertising", "email", "social"]);

export type NextStepKind = "no_change_yet" | "recommend";
export type NextStepClass = "operational" | "optimization" | "strategic";
export type NextStepSource = "drafts" | "specialist" | "review" | "owner_work" | "learning" | "goals" | "website";

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

export type OpenOwnerWork = {
  id: string
  description: string
  module: string
  actionType: string
  risk: string
};

export type UncheckedWork = {
  id: string
  description: string
  status: string
};

export type InferredDraft = {
  id: string
  kind: "offer" | "goal"
  title: string
  description: string
  inferredFrom: string
  confidence: number
};

export type SeoDraftItem = {
  id: string
  title: string
  proposedChange: string
  howToApply: string
};

export type OpenLeadItem = {
  id: string
  name: string
  email: string
  stageId: string
  stageName: string
  source: string
  isWon: boolean
};

export type LeadStageOption = {
  id: string
  name: string
};

export type GoalProgressRow = {
  id: string
  recordedAtLabel: string
  value: number
  source: string
  note: string
};

export type LearningGoal = {
  id: string
  title: string
  liveCurrentValue: number
  targetValue: number | null
  unit: string
  liveNote: string
  progressPercent: number | null
  liveComputable?: boolean
  progressHistory?: GoalProgressRow[]
};

export type NextStepInput = {
  inferredDraftCount: number
  reports: SpecialistReport[]
  waitingActions: WaitingAction[]
  openWork?: OpenOwnerWork[]
  openWorkCount?: number
  uncheckedWork?: UncheckedWork[]
  uncheckedWorkCount?: number
  inferredDrafts?: InferredDraft[]
  seoDrafts?: SeoDraftItem[]
  openLeads?: OpenLeadItem[]
  leadStages?: LeadStageOption[]
  learningGoal?: LearningGoal | null
  websiteConnected?: boolean
  websiteRead?: boolean
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
  proposePlanId?: string | null
  proposePlanGoalId?: string | null
  proposePlanGoalTitle?: string
  proposePlanVersion?: number
  activeGoalIds?: string[]
  readablePlan?: ReadableGrowthPlan | null
  readableGoal?: LearningGoal | null
  weeklyLook?: WeeklyLook | null
  readableDecisions?: ReadableDecision[]
  finishedWorkCount?: number
  latestLearning?: string
};

export type ReadableGrowthPlan = {
  id: string
  goalId: string
  goalTitle: string
  version: number
  status: string
  strategySummary: string
};

export type WeeklyLook = {
  periodLabel: string
  headline: string
  summary: string
  whatChanged: string
  howWeAreDoing: string
  whatNeedsAttention: string
  whatShouldHappenNext: string
  whatIsLeftAlone: string
  strategyNote: string
  recommendations: {
    title: string
    recommendation: string
    rationale: string
    evidence: string
    kind: "no_change_yet" | "recommend"
    classification: string
    confidence: number
  }[]
  evidenceChecks: {
    channel: string
    verdict: string
    reason: string
  }[]
};

export type ReadableDecision = {
  id: string
  decisionType: string
  recommendation: string
  rationale: string
  outcome: string
  evidenceWindow: string
  confidence: number
  createdAtLabel: string
};

export type CoordinatedNextStep = {
  primary: NextStepCandidate
  leftAlone: NextStepCandidate[]
  waitingActions: WaitingAction[]
  openWork: OpenOwnerWork[]
  uncheckedWork: UncheckedWork[]
  inferredDrafts: InferredDraft[]
  seoDrafts: SeoDraftItem[]
  openLeads: OpenLeadItem[]
  leadStages: LeadStageOption[]
  learningGoal: LearningGoal | null
  readablePlan: ReadableGrowthPlan | null
  readableGoal: LearningGoal | null
  weeklyLook: WeeklyLook | null
  readableDecisions: ReadableDecision[]
  reports: SpecialistReport[]
  finishedWorkCount: number
  latestLearning: string
  needsWebsiteReview: boolean
  activateGoalId: string | null
  activateGoalTitle: string
  planGoalId: string | null
  planGoalTitle: string
  approvePlanId: string | null
  proposePlanId: string | null
  reachedGoalId: string | null
  needsAddGoal: boolean
  needsConnectWebsite: boolean
  needsPasteSnippet: boolean
  needsShareLeadForm: boolean
  needsStripeReadCopy: boolean
  needsSaveBrand: boolean
  needsSaveBusiness: boolean
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
    title: CONFIRM_DRAFTS_STEP_TITLE,
    body: `${count} suggested offer${count === 1 ? "" : "s or goals"} still need you to confirm or reject here. Nothing becomes active until you do. GroovGro will not start marketing.`,
    href: "/app/next-step",
    source: "drafts",
    specialistId: null,
    goalId: null,
  };
}

function reviewSiteCandidate(
  connected: boolean | undefined,
  read: boolean | undefined,
): NextStepCandidate | null {
  if (!connected || read !== false) return null;
  return {
    kind: "recommend",
    classification: "operational",
    title: REVIEW_SITE_STEP_TITLE,
    body: "The website address is saved, but GroovGro has not read the pages yet. Find pages here, check the important ones, then review. GroovGro will not change the live site.",
    href: "/app/next-step",
    source: "website",
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
    title: ACTIVATE_GOAL_STEP_TITLE,
    body: `“${name}” is a draft. Make it the active Goal when you want GroovGro to follow it. GroovGro will not start marketing.`,
    href: "/app/next-step",
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
    href: "/app/next-step",
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
    href: "/app/next-step",
    source: "goals",
    specialistId: null,
    goalId: input.approvePlanGoalId ?? null,
    planId: input.approvePlanId,
  };
}

function proposeActionsCandidate(input: NextStepInput): NextStepCandidate | null {
  if (!input.proposePlanId) return null;
  const name =
    (input.proposePlanGoalTitle ?? "").replace(/\s+/g, " ").trim() || "this Goal";
  const version = input.proposePlanVersion;
  const versionLabel = version != null ? ` v${version}` : "";
  return {
    kind: "recommend",
    classification: "operational",
    title: PROPOSE_ACTIONS_STEP_TITLE,
    body: `“${name}” has approved plan${versionLabel}. Propose the first actions so you can review them. GroovGro will not run them.`,
    href: "/app/next-step",
    source: "goals",
    specialistId: null,
    goalId: input.proposePlanGoalId ?? null,
    planId: input.proposePlanId,
  };
}

function waitingActionsCandidate(count: number): NextStepCandidate | null {
  if (count <= 0) return null;
  return {
    kind: "recommend",
    classification: "operational",
    title: APPROVE_ACTIONS_STEP_TITLE,
    body: `${count} proposed action${count === 1 ? "" : "s"} ${count === 1 ? "needs" : "need"} your say. Approve or reject ${count === 1 ? "it" : "them"} here. Approving does not run ${count === 1 ? "it" : "them"}. GroovGro will not start marketing.`,
    href: "/app/next-step",
    source: "goals",
    specialistId: null,
    goalId: null,
  };
}

function ownerWorkCandidate(count: number): NextStepCandidate | null {
  if (count <= 0) return null;
  return {
    kind: "recommend",
    classification: "operational",
    title: OWNER_WORK_STEP_TITLE,
    body: `${count} approved action${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} ready. Do ${count === 1 ? "it" : "them"} here. GroovGro will not run ${count === 1 ? "it" : "them"}.`,
    href: "/app/next-step",
    source: "owner_work",
    specialistId: null,
    goalId: null,
  };
}

function checkChangedCandidate(count: number): NextStepCandidate | null {
  if (count <= 0) return null;
  return {
    kind: "recommend",
    classification: "operational",
    title: CHECK_CHANGED_STEP_TITLE,
    body: `${count} finished action${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} ready to check. Compare the Goal number here. GroovGro will not change the plan.`,
    href: "/app/next-step",
    source: "learning",
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
      title: GOAL_REACHED_STEP_TITLE,
      body:
        outcome ||
        `The Goal number reached its target. Draft the next Goal, then set it to Active when you want it.${leaveAlone}`,
      href: "/app/next-step",
      source: "learning",
      specialistId: null,
      goalId,
    };
  }
  if (kind === "declined") {
    return {
      kind: "recommend",
      classification: "operational",
      title: READ_GOAL_STEP_TITLE,
      body:
        outcome ||
        `The Goal number is lower than when you did the work. Read it here. Do not add spend.${leaveAlone}`,
      href: "/app/next-step",
      source: "learning",
      specialistId: null,
      goalId,
    };
  }
  if (kind === "no_goal") {
    return {
      kind: "recommend",
      classification: "operational",
      title: ADD_GOAL_STEP_TITLE,
      body:
        outcome ||
        `That work was not tied to a Goal. Add a Goal here so GroovGro can compare a number.${leaveAlone}`,
      href: "/app/next-step",
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
    href: "/app/next-step",
    source: "learning",
    specialistId: null,
    goalId,
  };
}

function withGoalHistory(goal: LearningGoal | null | undefined): LearningGoal | null {
  if (!goal) return null;
  return {
    ...goal,
    progressHistory: goal.progressHistory ?? [],
  };
}

function nothingYet(): NextStepCandidate {
  return {
    kind: "no_change_yet",
    classification: "optimization",
    title: "Nothing should change yet",
    body: "Keep collecting evidence from the connected website, leads, and payments. GroovGro will not start ads, send email, or change the live site.",
    href: "/app/next-step",
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
  const openWork = input.openWork ?? [];
  const uncheckedWork = input.uncheckedWork ?? [];
  const inferredDrafts = input.inferredDrafts ?? [];
  const seoDrafts = input.seoDrafts ?? [];
  const openLeads = input.openLeads ?? [];
  const leadStages = input.leadStages ?? [];
  const drafts = draftsCandidate(inferredDrafts.length || input.inferredDraftCount);
  const ownerWork = ownerWorkCandidate(input.openWorkCount ?? openWork.length);
  const checkChanged = checkChangedCandidate(
    input.uncheckedWorkCount ?? uncheckedWork.length,
  );
  const reviewSite = reviewSiteCandidate(input.websiteConnected, input.websiteRead);
  const activate = activateGoalCandidate(input.activateGoalId, input.activateGoalTitle);
  const draftPlan = draftPlanCandidate(input.planGoalId, input.planGoalTitle);
  const approvePlan = approvePlanCandidate(input);
  const proposeActions = proposeActionsCandidate(input);
  const waitingApprove = waitingActionsCandidate(waitingActions.length);
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
    primary: drafts ?? ownerWork ?? checkChanged ?? reviewSite ?? activate ?? draftPlan ?? approvePlan ?? proposeActions ?? waitingApprove ?? learning ?? ranked[0] ?? nothingYet(),
    leftAlone,
    waitingActions,
    openWork,
    uncheckedWork,
    inferredDrafts,
    seoDrafts,
    openLeads,
    leadStages,
    learningGoal: withGoalHistory(input.learningGoal),
    readablePlan: input.readablePlan ?? null,
    readableGoal: withGoalHistory(input.readableGoal),
    weeklyLook: input.weeklyLook ?? null,
    readableDecisions: input.readableDecisions ?? [],
    reports: input.reports,
    finishedWorkCount: input.finishedWorkCount ?? 0,
    latestLearning: input.latestLearning ?? "",
    needsWebsiteReview: Boolean(reviewSite),
    activateGoalId: activate?.goalId ?? null,
    activateGoalTitle: (input.activateGoalTitle ?? "").replace(/\s+/g, " ").trim(),
    planGoalId: draftPlan?.goalId ?? null,
    planGoalTitle: (input.planGoalTitle ?? "").replace(/\s+/g, " ").trim(),
    approvePlanId: approvePlan?.planId ?? null,
    proposePlanId: proposeActions?.planId ?? null,
    reachedGoalId:
      !activate && learning?.title === GOAL_REACHED_STEP_TITLE
        ? (learning.goalId ?? null)
        : null,
    needsAddGoal: learning?.title === ADD_GOAL_STEP_TITLE,
    needsConnectWebsite: input.websiteConnected === false,
    needsPasteSnippet: input.reports.some(
      (report) => report.recommend.title === PASTE_SNIPPET_STEP_TITLE,
    ),
    needsShareLeadForm: input.reports.some(
      (report) => report.recommend.title === SHARE_LEAD_FORM_STEP_TITLE,
    ),
    needsStripeReadCopy: input.reports.some(
      (report) =>
        report.recommend.title === CONNECT_STRIPE_STEP_TITLE ||
        report.recommend.title === SYNC_STRIPE_STEP_TITLE,
    ),
    needsSaveBrand: input.reports.some(
      (report) => report.recommend.title === SAVE_BRAND_STEP_TITLE,
    ),
    needsSaveBusiness: input.reports.some(
      (report) => report.recommend.title === SAVE_BUSINESS_STEP_TITLE,
    ),
    executeAllowed: false,
  };
}
