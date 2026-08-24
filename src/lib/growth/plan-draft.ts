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

export function draftGrowthPlanSummary(facts: PlanDraftFacts): string {
  const name = clean(facts.businessName) || "This business";
  const goal = facts.goal;
  const offers = facts.offers.map((offer) => clean(offer.name)).filter(Boolean);
  const doNow: string[] = [];
  if (facts.nextStepKind === "recommend" && clean(facts.nextStepTitle)) {
    doNow.push(`${clean(facts.nextStepTitle)}. ${clean(facts.nextStepBody)}`);
  }
  if (facts.openLeadCount > 0) {
    doNow.push(
      `Follow up ${facts.openLeadCount} open lead${facts.openLeadCount === 1 ? "" : "s"} in Leads & customers. GroovGro will not email them.`,
    );
  }
  if (!facts.websiteConnected) {
    doNow.push(
      "Connect the existing website and paste the tracking snippet. Do not move the live site into GroovGro.",
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
      : "No confirmed offers yet. Confirm or reject drafts on Business before promoting anything.",
    `What we will do now: ${doNow.join(" ")}`,
    `What we will not do: ${leaveLine} This plan does not charge a card or change Stripe checkout.`,
    "How we will know it is working: compare the Goal’s saved progress to the target. If evidence is thin, the right move is to wait.",
  ];

  return clip(parts.filter(Boolean).join("\n\n"), 4000);
}
