import { APPROVE_ACTIONS_STEP_TITLE, APPROVE_PLAN_STEP_TITLE, CHECK_CHANGED_STEP_TITLE, DRAFT_PLAN_STEP_TITLE, OWNER_WORK_STEP_TITLE, PROPOSE_ACTIONS_STEP_TITLE } from "@/lib/growth/plan-draft";

export type PlanActionRisk = "operational" | "optimization" | "strategic";

export type PlanActionDraft = {
  actionType: string
  module: string
  description: string
  risk: PlanActionRisk
};

export type PlanActionFacts = {
  goalTitle: string
  nextStepTitle: string
  nextStepBody: string
  nextStepKind: "no_change_yet" | "recommend"
  websiteConnected: boolean
  openLeadCount: number
  confirmedOfferCount: number
  inferredOfferCount: number
};

const MAX_ACTIONS = 3;

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function isLoopingNextStep(title: string): boolean {
  const text = clean(title);
  return (
    text === DRAFT_PLAN_STEP_TITLE ||
    text === APPROVE_PLAN_STEP_TITLE ||
    text === PROPOSE_ACTIONS_STEP_TITLE ||
    text === APPROVE_ACTIONS_STEP_TITLE ||
    text === OWNER_WORK_STEP_TITLE ||
    text === CHECK_CHANGED_STEP_TITLE
  );
}

export function findPlanNeedingActions<
  G extends {
    id: string
    title: string
    status: string
    discoveryStatus?: string
  },
  P extends {
    id: string
    goalId: string
    status: string
    version: number
  },
  A extends { planId: string | null },
>(goals: G[], plans: P[], actions: A[]): { plan: P; goal: G } | null {
  const activeIds = new Set(
    goals
      .filter((goal) => {
        if (goal.status !== "active") return false;
        const discovery = goal.discoveryStatus ?? "confirmed";
        return discovery !== "inferred" && discovery !== "rejected";
      })
      .map((goal) => goal.id),
  );
  const approved = plans
    .filter(
      (plan) =>
        (plan.status === "approved" || plan.status === "active") &&
        activeIds.has(plan.goalId),
    )
    .sort((a, b) => b.version - a.version);
  for (const plan of approved) {
    if (actions.some((action) => action.planId === plan.id)) continue;
    const goal = goals.find((row) => row.id === plan.goalId);
    if (goal) return { plan, goal };
  }
  return null;
}

export function draftActionsFromApprovedPlan(
  facts: PlanActionFacts,
): PlanActionDraft[] {
  const drafts: PlanActionDraft[] = [];
  const goal = clean(facts.goalTitle) || "this Goal";

  if (facts.openLeadCount > 0) {
    drafts.push({
      actionType: "follow_up_leads",
      module: "crm",
      risk: "operational",
      description: clip(
        `Open Leads & customers and give each of the ${facts.openLeadCount} open lead${facts.openLeadCount === 1 ? "" : "s"} a next step. GroovGro will not email them.`,
        2000,
      ),
    });
  }

  if (!facts.websiteConnected) {
    drafts.push({
      actionType: "connect_website",
      module: "website",
      risk: "operational",
      description: clip(
        "Connect the existing website and paste the tracking snippet. Do not move the live site into GroovGro.",
        2000,
      ),
    });
  }

  if (facts.confirmedOfferCount === 0 && facts.inferredOfferCount > 0) {
    drafts.push({
      actionType: "confirm_offers",
      module: "offers",
      risk: "operational",
      description: clip(
        "Open Business and confirm or reject the draft offers. Do not promote anything that is still a draft.",
        2000,
      ),
    });
  }

  if (facts.nextStepKind === "recommend" && clean(facts.nextStepTitle) && !isLoopingNextStep(facts.nextStepTitle)) {
    const body = clean(facts.nextStepBody);
    drafts.push({
      actionType: "do_next_step",
      module: "growth_next",
      risk: "operational",
      description: clip(
        `${clean(facts.nextStepTitle)}.${body ? ` ${body}` : ""} GroovGro will not run this.`,
        2000,
      ),
    });
  }

  if (drafts.length === 0) {
    drafts.push({
      actionType: "watch_progress",
      module: "growth_goals",
      risk: "optimization",
      description: clip(
        `Keep collecting evidence for “${goal}”. Compare saved Goal progress to the target. Do not change course, start ads, or send email yet.`,
        2000,
      ),
    });
  }

  return drafts.slice(0, MAX_ACTIONS);
}
