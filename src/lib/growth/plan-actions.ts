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

  if (facts.nextStepKind === "recommend" && clean(facts.nextStepTitle)) {
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
