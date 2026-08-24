import { isGoalAchieved } from "@/lib/growth/types";

export const WORK_LEARNING_WAIT_DAYS = 7;
export const BASELINE_PREFIX = "baseline=";

export type WorkLearningKind =
  | "no_goal"
  | "need_baseline"
  | "too_soon"
  | "improved"
  | "same"
  | "declined"
  | "target_reached";

export type WorkLearningFacts = {
  goalTitle: string
  hasGoal: boolean
  baselineValue: number | null
  currentValue: number | null
  targetValue: number | null
  unit: string
  daysSinceDone: number
};

export type WorkLearning = {
  kind: WorkLearningKind
  outcome: string
  changeCourse: false
};

export type WorkBaseline = {
  value: number
  targetValue: number | null
  unit: string
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function withUnit(value: number, unit: string): string {
  const label = clean(unit);
  return label ? `${value} ${label}` : String(value);
}

export function encodeWorkBaseline(baseline: WorkBaseline): string {
  const target = baseline.targetValue == null ? "" : String(baseline.targetValue);
  return `${BASELINE_PREFIX}${baseline.value};target=${target};unit=${clean(baseline.unit)}`;
}

export function parseWorkBaseline(text: string): WorkBaseline | null {
  const match = text.match(/baseline=(-?\d+(?:\.\d+)?);target=([^;]*);unit=([^\n]*)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const targetRaw = (match[2] ?? "").trim();
  const targetValue = targetRaw === "" ? null : Number(targetRaw);
  return {
    value,
    targetValue: targetValue != null && Number.isFinite(targetValue) ? targetValue : null,
    unit: (match[3] ?? "").trim(),
  };
}

export function learnFromOwnerWork(facts: WorkLearningFacts): WorkLearning {
  const goal = clean(facts.goalTitle) || "this Goal";
  const leaveAlone =
    " Do not change the plan, start ads, send email, or change the live website.";

  if (!facts.hasGoal || facts.currentValue == null) {
    return {
      kind: "no_goal",
      changeCourse: false,
      outcome: clip(
        `This work is not tied to a Goal number, so GroovGro cannot compare progress.${leaveAlone} Add a Goal here so GroovGro can compare a number.`,
        2000,
      ),
    };
  }

  if (facts.baselineValue == null) {
    return {
      kind: "need_baseline",
      changeCourse: false,
      outcome: clip(
        `GroovGro saved today’s number for “${goal}” (${withUnit(facts.currentValue, facts.unit)}) as the starting point. Check again later.${leaveAlone}`,
        2000,
      ),
    };
  }

  const current = facts.currentValue;
  const baseline = facts.baselineValue;
  const delta = current - baseline;
  const moved =
    delta === 0
      ? `The number is still ${withUnit(current, facts.unit)}.`
      : delta > 0
        ? `The number moved from ${withUnit(baseline, facts.unit)} to ${withUnit(current, facts.unit)}.`
        : `The number is ${withUnit(current, facts.unit)}, down from ${withUnit(baseline, facts.unit)} when you marked this done.`;

  if (isGoalAchieved(current, facts.targetValue)) {
    return {
      kind: "target_reached",
      changeCourse: false,
      outcome: clip(
        `After you did this work, “${goal}” reached its target (${withUnit(current, facts.unit)}). ${moved} Open Goals to read the history. GroovGro will not start a new campaign.${leaveAlone}`,
        2000,
      ),
    };
  }

  if (facts.daysSinceDone < WORK_LEARNING_WAIT_DAYS) {
    return {
      kind: "too_soon",
      changeCourse: false,
      outcome: clip(
        `It has been ${Math.max(0, facts.daysSinceDone)} day${facts.daysSinceDone === 1 ? "" : "s"} since you marked this done. ${moved} Wait before changing course.${leaveAlone}`,
        2000,
      ),
    };
  }

  if (delta > 0) {
    return {
      kind: "improved",
      changeCourse: false,
      outcome: clip(
        `After you did this work, “${goal}” improved. ${moved} That is not a reason to start ads. Keep collecting evidence.${leaveAlone}`,
        2000,
      ),
    };
  }

  if (delta < 0) {
    return {
      kind: "declined",
      changeCourse: false,
      outcome: clip(
        `After you did this work, “${goal}” is lower. ${moved} Do not add spend. Read the Goal number here.${leaveAlone}`,
        2000,
      ),
    };
  }

  return {
    kind: "same",
    changeCourse: false,
    outcome: clip(
      `After you did this work, “${goal}” has not moved yet. ${moved} Keep collecting evidence.${leaveAlone}`,
      2000,
    ),
  };
}

export function workLearningFromResult(result: string): string {
  const parts = result.split("What changed:");
  return clean(parts[1] ?? "");
}

export function learningKindFromOutcome(outcome: string): WorkLearningKind | null {
  const text = clean(outcome);
  if (!text) return null;
  if (/reached its target/i.test(text)) return "target_reached";
  if (/is lower/i.test(text)) return "declined";
  if (/improved/i.test(text)) return "improved";
  if (/has not moved yet/i.test(text)) return "same";
  if (/starting point/i.test(text)) return "need_baseline";
  if (/Wait before changing course/i.test(text)) return "too_soon";
  if (/not tied to a Goal/i.test(text)) return "no_goal";
  return null;
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / 86_400_000);
}
