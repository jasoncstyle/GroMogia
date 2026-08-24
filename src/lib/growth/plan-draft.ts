import { canDraftNextGoal } from "@/lib/growth/next-goal";
import { labelFor } from "@/lib/growth/types";

export type PlanDraftGoal = {
  title: string
  goalType: string
  status: string
  liveCurrentValue: number
  targetValue: number | null
  unit: string
  liveNote: string
  progressPercent: number | null
};

export type PlanDraftFacts = {
  businessName: string
  description: string
  targetCustomers: string
  goal: PlanDraftGoal
  offers: { name: string; description: string }[]
  nextStepTitle: string
  nextStepBody: string
  nextStepKind: "no_change_yet" | "recommend"
  leftAlone: string[]
  websiteConnected: boolean
  openLeadCount: number
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function listPhrase(values: string[]): string {
  const items = values.map(clean).filter(Boolean);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function progressLine(goal: PlanDraftGoal): string {
  const unit = clean(goal.unit);
  const current = unit ? `${goal.liveCurrentValue} ${unit}` : String(goal.liveCurrentValue);
  if (goal.targetValue == null) {
    return goal.liveNote || `Current number: ${current}.`;
  }
  const target = unit ? `${goal.targetValue} ${unit}` : String(goal.targetValue);
  const percent =
    goal.progressPercent != null ? ` That is ${goal.progressPercent}% of the target.` : "";
  return `${current} of ${target}.${percent}${goal.liveNote ? ` ${goal.liveNote}` : ""}`;
}

export const DRAFT_PLAN_STEP_TITLE = "Draft a plan for this Goal";
export const APPROVE_PLAN_STEP_TITLE = "Approve this plan";
export const PROPOSE_ACTIONS_STEP_TITLE = "Propose the first actions";
export const APPROVE_ACTIONS_STEP_TITLE = "Approve or reject these actions";
export const OWNER_WORK_STEP_TITLE = "Do the work you already approved";
export const CHECK_CHANGED_STEP_TITLE = "Check what changed";
export const CONFIRM_DRAFTS_STEP_TITLE = "Confirm or reject what GroovGro drafted";
export const CONNECT_WEBSITE_STEP_TITLE = "Connect the existing website";
export const REVIEW_SITE_STEP_TITLE = "Review the connected website";
export const FOLLOW_UP_LEADS_STEP_TITLE = "Follow up open leads";
export const SHARE_LEAD_FORM_STEP_TITLE = "Share the public lead form";
export const SAVE_BRAND_VOICE_STEP_TITLE = "Save your brand voice";
export const ADD_BRAND_VOICE_EXAMPLE_STEP_TITLE = "Add a brand voice example";
export const DRAFT_BRAND_VOICE_STEP_TITLE = "Draft copy in your voice";
export const RUN_SEO_STEP_TITLE = "Run an SEO check";
export const FIX_SEO_STEP_TITLE = "Fix blocking SEO items";
export const IMPROVE_SEO_STEP_TITLE = "Improve the page when you have time";
export const CONNECT_SEARCH_CONSOLE_STEP_TITLE = "Connect Search Console";
export const PICK_SEARCH_CONSOLE_STEP_TITLE = "Choose the Search Console property";
export const REFRESH_SEARCH_CONSOLE_STEP_TITLE = "Refresh Search Console numbers";
export const PASTE_SNIPPET_STEP_TITLE = "Paste the tracking snippet";
export const REVIEW_SCHEDULE_STEP_TITLE = "Review the schedule or how people find it";
export const GOAL_REACHED_STEP_TITLE = "This Goal is reached";
export const ACTIVATE_GOAL_STEP_TITLE = "Make this the active Goal";
export const READ_GOAL_STEP_TITLE = "Read the Goal before changing course";
export const ADD_GOAL_STEP_TITLE = "Add a Goal so GroovGro can compare a number";
export const ADD_OFFER_STEP_TITLE = "Add an offer";
export const SAVE_BRAND_STEP_TITLE = "Save your brand";
export const SAVE_BUSINESS_STEP_TITLE = "Save how this business works";
export const SAVE_PROGRESS_STEP_TITLE = "Save today's Goal number";
export const CONNECT_STRIPE_STEP_TITLE = "Connect payments";
export const SYNC_STRIPE_STEP_TITLE = "Sync recent payments";
export const SAVE_REVIEW_SCHEDULE_STEP_TITLE = "Choose when you look at growth";

export function skipsDuplicateNextStepAction(title: string): boolean {
  const text = clean(title);
  return (
    text === FOLLOW_UP_LEADS_STEP_TITLE ||
    text === SHARE_LEAD_FORM_STEP_TITLE ||
    text === SAVE_BRAND_VOICE_STEP_TITLE ||
    text === ADD_BRAND_VOICE_EXAMPLE_STEP_TITLE ||
    text === DRAFT_BRAND_VOICE_STEP_TITLE ||
    text === RUN_SEO_STEP_TITLE ||
    text === FIX_SEO_STEP_TITLE ||
    text === IMPROVE_SEO_STEP_TITLE ||
    text === CONNECT_SEARCH_CONSOLE_STEP_TITLE ||
    text === PICK_SEARCH_CONSOLE_STEP_TITLE ||
    text === REFRESH_SEARCH_CONSOLE_STEP_TITLE ||
    text === PASTE_SNIPPET_STEP_TITLE ||
    text === REVIEW_SCHEDULE_STEP_TITLE ||
    text === GOAL_REACHED_STEP_TITLE ||
    text === ACTIVATE_GOAL_STEP_TITLE ||
    text === DRAFT_PLAN_STEP_TITLE ||
    text === APPROVE_PLAN_STEP_TITLE ||
    text === PROPOSE_ACTIONS_STEP_TITLE ||
    text === READ_GOAL_STEP_TITLE ||
    text === ADD_GOAL_STEP_TITLE ||
    text === ADD_OFFER_STEP_TITLE ||
    text === SAVE_BRAND_STEP_TITLE ||
    text === SAVE_BUSINESS_STEP_TITLE ||
    text === SAVE_PROGRESS_STEP_TITLE ||
    text === CONNECT_STRIPE_STEP_TITLE ||
    text === SYNC_STRIPE_STEP_TITLE ||
    text === SAVE_REVIEW_SCHEDULE_STEP_TITLE
  );
}

export function hasDedicatedNextStepControls(title: string): boolean {
  const text = clean(title);
  return (
    text === GOAL_REACHED_STEP_TITLE ||
    text === ACTIVATE_GOAL_STEP_TITLE ||
    text === DRAFT_PLAN_STEP_TITLE ||
    text === APPROVE_PLAN_STEP_TITLE ||
    text === PROPOSE_ACTIONS_STEP_TITLE
  );
}

export function showsDedicatedNextStepControl(
  title: string,
  access: {
    canCreateGoal: boolean
    canActivateGoal: boolean
    canDraftPlan: boolean
    goalId?: string | null
    planId?: string | null
  },
): boolean {
  const text = clean(title);
  if (text === GOAL_REACHED_STEP_TITLE) return Boolean(access.canCreateGoal && access.goalId);
  if (text === ACTIVATE_GOAL_STEP_TITLE) return Boolean(access.canActivateGoal && access.goalId);
  if (text === DRAFT_PLAN_STEP_TITLE) return Boolean(access.canDraftPlan && access.goalId);
  if (text === APPROVE_PLAN_STEP_TITLE) return Boolean(access.planId);
  if (text === PROPOSE_ACTIONS_STEP_TITLE) return Boolean(access.canDraftPlan && access.planId);
  return false;
}

export function openPageLabelForNextStep(title: string): string | null {
  return null;
}

export function isSeoDraftNextStep(title: string): boolean {
  const text = clean(title);
  return text === FIX_SEO_STEP_TITLE || text === IMPROVE_SEO_STEP_TITLE;
}

export function isSearchConsoleNextStep(title: string): boolean {
  const text = clean(title);
  return (
    text === CONNECT_SEARCH_CONSOLE_STEP_TITLE ||
    text === PICK_SEARCH_CONSOLE_STEP_TITLE ||
    text === REFRESH_SEARCH_CONSOLE_STEP_TITLE
  );
}

export function isPasteSnippetNextStep(title: string): boolean {
  return clean(title) === PASTE_SNIPPET_STEP_TITLE;
}

export function isReviewScheduleNextStep(title: string): boolean {
  return clean(title) === REVIEW_SCHEDULE_STEP_TITLE;
}

export function isFollowUpLeadsNextStep(title: string): boolean {
  return clean(title) === FOLLOW_UP_LEADS_STEP_TITLE;
}

export function isShareLeadFormNextStep(title: string): boolean {
  return clean(title) === SHARE_LEAD_FORM_STEP_TITLE;
}

export function isSaveBrandVoiceNextStep(title: string): boolean {
  return clean(title) === SAVE_BRAND_VOICE_STEP_TITLE;
}

export function isAddBrandVoiceExampleNextStep(title: string): boolean {
  return clean(title) === ADD_BRAND_VOICE_EXAMPLE_STEP_TITLE;
}

export function isDraftBrandVoiceNextStep(title: string): boolean {
  return clean(title) === DRAFT_BRAND_VOICE_STEP_TITLE;
}

export function isAddGoalNextStep(title: string): boolean {
  return clean(title) === ADD_GOAL_STEP_TITLE;
}

export function isAddOfferNextStep(title: string): boolean {
  return clean(title) === ADD_OFFER_STEP_TITLE;
}

export function isSaveBrandNextStep(title: string): boolean {
  return clean(title) === SAVE_BRAND_STEP_TITLE;
}

export function isSaveBusinessNextStep(title: string): boolean {
  return clean(title) === SAVE_BUSINESS_STEP_TITLE;
}

export function isSaveProgressNextStep(title: string): boolean {
  return clean(title) === SAVE_PROGRESS_STEP_TITLE;
}

export function isStripeReadCopyNextStep(title: string): boolean {
  const text = clean(title);
  return text === CONNECT_STRIPE_STEP_TITLE || text === SYNC_STRIPE_STEP_TITLE;
}

export function isSaveReviewScheduleNextStep(title: string): boolean {
  return clean(title) === SAVE_REVIEW_SCHEDULE_STEP_TITLE;
}

export function isReadGoalNextStep(title: string): boolean {
  return clean(title) === READ_GOAL_STEP_TITLE;
}

function isPlanLoopNextStep(title: string): boolean {
  const text = clean(title);
  return (
    text === DRAFT_PLAN_STEP_TITLE ||
    text === APPROVE_PLAN_STEP_TITLE ||
    text === PROPOSE_ACTIONS_STEP_TITLE ||
    text === APPROVE_ACTIONS_STEP_TITLE ||
    text === OWNER_WORK_STEP_TITLE ||
    text === CHECK_CHANGED_STEP_TITLE ||
    text === CONFIRM_DRAFTS_STEP_TITLE ||
    text === CONNECT_WEBSITE_STEP_TITLE ||
    text === REVIEW_SITE_STEP_TITLE
  );
}

export function goalNeedsPlanDraft(
  goal: {
    id: string
    status: string
    currentValue: number
    targetValue: number | null
    discoveryStatus?: string
  },
  plans: { goalId: string; status: string }[],
): boolean {
  if (goal.status !== "active") return false;
  if (goal.discoveryStatus === "inferred") return false;
  if (
    canDraftNextGoal({
      status: goal.status,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue,
    })
  ) {
    return false;
  }
  return !plans.some(
    (plan) =>
      plan.goalId === goal.id &&
      (plan.status === "draft" || plan.status === "approved" || plan.status === "active"),
  );
}

export function findPlanDraftGoal<
  T extends {
    id: string
    status: string
    currentValue: number
    targetValue: number | null
    discoveryStatus?: string
  },
>(goals: T[], plans: { goalId: string; status: string }[]): T | null {
  return goals.find((goal) => goalNeedsPlanDraft(goal, plans)) ?? null;
}

function activeConfirmedGoalIds<
  G extends { id: string; status: string; discoveryStatus?: string },
>(goals: G[]): Set<string> {
  return new Set(
    goals
      .filter((goal) => {
        if (goal.status !== "active") return false;
        const discovery = goal.discoveryStatus ?? "confirmed";
        return discovery !== "inferred" && discovery !== "rejected";
      })
      .map((goal) => goal.id),
  );
}

export function findDraftPlanToApprove<
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
    strategySummary: string
  },
>(goals: G[], plans: P[]): { plan: P; goal: G } | null {
  const activeIds = activeConfirmedGoalIds(goals);
  const drafts = plans
    .filter((plan) => plan.status === "draft" && activeIds.has(plan.goalId))
    .sort((a, b) => b.version - a.version);
  const plan = drafts[0];
  if (!plan) return null;
  const goal = goals.find((row) => row.id === plan.goalId);
  if (!goal) return null;
  return { plan, goal };
}

export function findReadableGrowthPlan<
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
    strategySummary: string
  },
>(goals: G[], plans: P[]): { plan: P; goal: G } | null {
  const draft = findDraftPlanToApprove(goals, plans);
  if (draft) return draft;
  const activeIds = activeConfirmedGoalIds(goals);
  const readable = plans
    .filter(
      (plan) =>
        (plan.status === "approved" || plan.status === "active") &&
        activeIds.has(plan.goalId),
    )
    .sort((a, b) => b.version - a.version);
  const plan = readable[0];
  if (!plan) return null;
  const goal = goals.find((row) => row.id === plan.goalId);
  if (!goal) return null;
  return { plan, goal };
}

export function draftPlanExcerpt(summary: string): string {
  return clip(summary, 400);
}

export function draftGrowthPlanSummary(facts: PlanDraftFacts): string {
  const name = clean(facts.businessName) || "This business";
  const goal = facts.goal;
  const offers = facts.offers.map((offer) => clean(offer.name)).filter(Boolean);
  const doNow: string[] = [];
  if (facts.nextStepKind === "recommend" && clean(facts.nextStepTitle) && !isPlanLoopNextStep(facts.nextStepTitle)) {
    doNow.push(`${clean(facts.nextStepTitle)}. ${clean(facts.nextStepBody)}`);
  }
  if (facts.openLeadCount > 0) {
    doNow.push(
      `Follow up ${facts.openLeadCount} open lead${facts.openLeadCount === 1 ? "" : "s"} on Next step. GroovGro will not email them.`,
    );
  }
  if (!facts.websiteConnected) {
    doNow.push(
      "On Next step, connect the existing website and paste the tracking snippet. Do not move the live site into GroovGro.",
    );
  }
  if (doNow.length === 0) {
    doNow.push(
      "Keep collecting outcomes from the connected website, leads, and payments. Do not change course until there is enough evidence.",
    );
  }

  const leave = facts.leftAlone.map(clean).filter(Boolean);
  const leaveLine =
    leave.length > 0
      ? leave.join(" ")
      : "Leave ads, email, and social alone. GroovGro will not buy ads, send email, or change the live website.";

  const parts = [
    `Plan for “${clean(goal.title)}” (${labelFor(goal.goalType)}) at ${name}.`,
    clean(facts.description) ? `What the business does: ${clean(facts.description)}` : "",
    clean(facts.targetCustomers) ? `Who it is for: ${clean(facts.targetCustomers)}` : "",
    `Where we are: ${progressLine(goal)}`,
    offers.length > 0
      ? `Confirmed offers this plan can talk about: ${listPhrase(offers)}.`
      : "No confirmed offers yet. Confirm or reject drafts on Next step before promoting anything.",
    `What we will do now: ${doNow.join(" ")}`,
    `What we will not do: ${leaveLine} This plan does not charge a card or change Stripe checkout.`,
    "How we will know it is working: compare the Goal’s saved progress to the target. If evidence is thin, the right move is to wait.",
  ];

  return clip(parts.filter(Boolean).join("\n\n"), 4000);
}
