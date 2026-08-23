export const OFFER_TYPES = [
  "product",
  "service",
  "subscription",
  "registration",
  "appointment",
  "membership",
  "reservation",
  "contract",
  "donation",
  "lead",
  "other",
] as const;

export const PRICING_MODELS = [
  "unspecified",
  "one_time",
  "recurring",
  "donation",
  "quote",
  "free",
] as const;

export const CONSTRAINT_TYPES = [
  "inventory",
  "capacity",
  "schedule",
  "resource",
  "workload",
  "time_window",
  "external",
  "unconstrained",
] as const;

export const GOAL_TYPES = [
  "lead_generation",
  "revenue",
  "conversions",
  "registrations",
  "utilization",
  "retention",
  "repeat_purchases",
  "launch",
  "traffic",
  "visibility",
  "reputation",
  "custom",
] as const;

export const GOAL_STATUSES = [
  "draft",
  "active",
  "paused",
  "achieved",
  "missed",
  "cancelled",
] as const;

export const DECISION_TYPES = [
  "no_change",
  "recommend",
  "operational",
  "optimization",
  "strategic",
] as const;

export const REVIEW_FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const AUTONOMY_LEVELS = [
  { level: 1, name: "Observe", description: "Analyze only." },
  { level: 2, name: "Recommend", description: "Recommend and explain." },
  { level: 3, name: "Draft", description: "Prepare work for approval." },
  { level: 4, name: "Approve to execute", description: "Execute after approval." },
  { level: 5, name: "Guarded autopilot", description: "Later. Not enabled." },
  { level: 6, name: "Autonomous growth", description: "Later. Not enabled." },
] as const;

export const DEFAULT_EVIDENCE_POLICIES = [
  {
    channel: "default",
    minElapsedDays: 7,
    minObservations: 20,
    minConversions: 5,
    notes: "Wait for enough outcomes before an optimization change.",
  },
  {
    channel: "advertising",
    minElapsedDays: 7,
    minObservations: 50,
    minConversions: 15,
    notes: "Account for platform learning and conversion lag.",
  },
  {
    channel: "seo",
    minElapsedDays: 28,
    minObservations: 10,
    minConversions: 3,
    notes: "SEO needs a longer observation window than ads or email.",
  },
  {
    channel: "email",
    minElapsedDays: 3,
    minObservations: 30,
    minConversions: 5,
    notes: "Email can produce evidence faster, still watch audience size.",
  },
  {
    channel: "social",
    minElapsedDays: 7,
    minObservations: 40,
    minConversions: 5,
    notes: "Engagement is not the same as a business outcome.",
  },
  {
    channel: "website",
    minElapsedDays: 14,
    minObservations: 100,
    minConversions: 10,
    notes: "CRO speed depends on traffic and conversion volume.",
  },
] as const;

export type EvidenceSample = {
  elapsedDays: number
  observations: number
  conversions: number
};

export type EvidencePolicy = {
  minElapsedDays: number
  minObservations: number
  minConversions: number
};

export function goalProgressPercent(
  currentValue: number,
  targetValue: number | null,
): number | null {
  if (targetValue == null || targetValue <= 0) return null;
  return Math.max(0, Math.round((currentValue / targetValue) * 100));
}

export function isGoalAchieved(
  currentValue: number,
  targetValue: number | null,
): boolean {
  return targetValue != null && targetValue > 0 && currentValue >= targetValue;
}

export function hasEnoughEvidence(
  sample: EvidenceSample,
  policy: EvidencePolicy,
): boolean {
  return (
    sample.elapsedDays >= policy.minElapsedDays &&
    sample.observations >= policy.minObservations &&
    sample.conversions >= policy.minConversions
  );
}

export function evidenceRecommendation(
  sample: EvidenceSample,
  policy: EvidencePolicy,
): "change_allowed" | "no_change_yet" {
  return hasEnoughEvidence(sample, policy) ? "change_allowed" : "no_change_yet";
}

export function listFromCommaText(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function commaTextFromList(values: string[] | null | undefined): string {
  return (values ?? []).join(", ");
}

export function parseOptionalInt(value: string | undefined): number | null {
  if (!value || !value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function labelFor(value: string): string {
  return value.replaceAll("_", " ");
}
