import type { SpecialistId, SpecialistReport } from "@/lib/growth/specialists";

const DISCONNECTED_CHANNELS = new Set<SpecialistId>(["advertising", "email", "social"]);

export type NextStepKind = "no_change_yet" | "recommend";
export type NextStepClass = "operational" | "optimization" | "strategic";
export type NextStepSource = "drafts" | "specialist" | "review";

export type NextStepCandidate = {
  kind: NextStepKind
  classification: NextStepClass
  title: string
  body: string
  href: string
  source: NextStepSource
  specialistId: SpecialistId | null
  goalId: string | null
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
  const usable = input.reports.filter((report) => !DISCONNECTED_CHANNELS.has(report.id));
  const leftAlone = [
    ...input.reports.filter((report) => DISCONNECTED_CHANNELS.has(report.id)).map(fromReport),
    ...usable.filter((report) => report.recommend.kind === "no_change_yet").map(fromReport),
  ];

  const ranked = [
    ...(drafts ? [drafts] : []),
    ...usable.filter((report) => report.recommend.kind === "recommend").map(fromReport),
  ].sort((a, b) => score(b) - score(a));

  return {
    primary: ranked[0] ?? nothingYet(),
    leftAlone,
    waitingActions,
    executeAllowed: false,
  };
}
