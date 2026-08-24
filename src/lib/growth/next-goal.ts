import { isGoalAchieved } from "@/lib/growth/types";

export const REACHED_GOAL_SOURCE = "reached:";

export type ReachedGoalInput = {
  id: string
  title: string
  goalType: string
  unit: string
  currentValue: number
  targetValue: number | null
  offerId: string | null
  successDefinition: string
  status: string
};

export type NextGoalDraft = {
  title: string
  description: string
  goalType: string
  unit: string
  baselineValue: number
  currentValue: number
  targetValue: number | null
  offerId: string | null
  successDefinition: string
  inferredFrom: string
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function baseTitle(title: string): string {
  return clean(title).replace(/^Next:\s+/i, "");
}

function withUnit(value: number, unit: string): string {
  const label = clean(unit);
  return label ? `${value} ${label}` : String(value);
}

export function nextGoalTarget(
  currentValue: number,
  previousTarget: number | null,
): number | null {
  if (previousTarget == null || previousTarget <= 0) return null;
  return currentValue + previousTarget;
}

export function reachedGoalSource(goalId: string): string {
  return `${REACHED_GOAL_SOURCE}${goalId}`;
}

export function canDraftNextGoal(goal: {
  status: string
  currentValue: number
  targetValue: number | null
}): boolean {
  return goal.status === "achieved" || isGoalAchieved(goal.currentValue, goal.targetValue);
}

export function alreadyDraftedNextGoal(
  goals: { inferredFrom: string }[],
  reachedGoalId: string,
): boolean {
  const source = reachedGoalSource(reachedGoalId);
  return goals.some((goal) => goal.inferredFrom === source);
}

export function draftNextGoalFromReached(goal: ReachedGoalInput): NextGoalDraft {
  const title = baseTitle(goal.title) || "this Goal";
  const current = goal.currentValue;
  const target = nextGoalTarget(current, goal.targetValue);
  const unit = clean(goal.unit);

  return {
    title: clip(`Next: ${title}`, 160),
    description: clip(
      `Drafted after “${title}” reached its target. Review the numbers, then set this Goal to Active when you want it. GroovGro will not start marketing.`,
      1000,
    ),
    goalType: goal.goalType || "custom",
    unit,
    baselineValue: current,
    currentValue: current,
    targetValue: target,
    offerId: goal.offerId,
    successDefinition: clip(
      target != null
        ? `Reach ${withUnit(target, unit)} starting from ${withUnit(current, unit)}.`
        : `Set a new target for “${title}”. GroovGro will not invent a number.`,
      1000,
    ),
    inferredFrom: reachedGoalSource(goal.id),
  };
}
