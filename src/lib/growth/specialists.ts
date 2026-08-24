import { DEFAULT_EVIDENCE_POLICIES, evidenceRecommendation, labelFor } from "@/lib/growth/types";
import type { EvidencePolicy, EvidenceSample } from "@/lib/growth/types";
import { CONNECT_WEBSITE_STEP_TITLE, FOLLOW_UP_LEADS_STEP_TITLE } from "@/lib/growth/plan-draft";

export const SPECIALIST_IDS = [
  "seo",
  "website",
  "crm",
  "availability",
  "advertising",
  "email",
  "social",
] as const;

export type SpecialistId = (typeof SPECIALIST_IDS)[number];

export type SpecialistGoal = {
  id: string
  title: string
  status: string
  goalType: string
  liveCurrentValue: number
  targetValue: number | null
  progressPercent: number | null
  liveNote: string
};

export type SpecialistPolicy = EvidencePolicy & {
  channel: string
};

export type SpecialistFacts = {
  now: Date
  goals: SpecialistGoal[]
  inferredDraftCount: number
  policies: SpecialistPolicy[]
  websiteConnected: boolean
  websiteUrl: string
  seoScore: number | null
  seoSummary: string
  seoFailCount: number
  seoWarnCount: number
  seoCheckedAt: Date | null
  searchConsoleConnected: boolean
  openLeadCount: number
  upcomingEventCount: number
  evidenceSample: EvidenceSample
  advertisingConnected: boolean
  emailConnected: boolean
  socialConnected: boolean
};

export type SpecialistRecommend = {
  kind: "no_change_yet" | "recommend"
  classification: "operational" | "optimization" | "strategic"
  title: string
  body: string
  href: string
};

export type SpecialistReport = {
  id: SpecialistId
  name: string
  mode: "read_analyze_recommend"
  available: boolean
  relatedGoal: { id: string; title: string; goalType: string } | null
  read: string
  analyze: string
  recommend: SpecialistRecommend
  executeAllowed: false
};

const NAMES: Record<SpecialistId, string> = {
  seo: "SEO",
  website: "Website",
  crm: "Leads",
  availability: "Schedule and availability",
  advertising: "Advertising",
  email: "Email",
  social: "Social",
};

const GOAL_TYPES: Record<SpecialistId, string[]> = {
  seo: ["visibility", "traffic", "lead_generation", "reputation"],
  website: ["visibility", "traffic", "lead_generation", "conversions"],
  crm: ["lead_generation", "conversions"],
  availability: ["utilization", "registrations"],
  advertising: ["lead_generation", "revenue", "visibility"],
  email: ["lead_generation", "retention", "repeat_purchases"],
  social: ["visibility", "reputation", "traffic"],
};

const CHANNEL: Record<SpecialistId, string> = {
  seo: "seo",
  website: "website",
  crm: "default",
  availability: "default",
  advertising: "advertising",
  email: "email",
  social: "social",
};

function policyFor(policies: SpecialistPolicy[], channel: string): EvidencePolicy {
  return (
    policies.find((row) => row.channel === channel) ??
    DEFAULT_EVIDENCE_POLICIES.find((row) => row.channel === channel) ??
    DEFAULT_EVIDENCE_POLICIES[0]
  );
}

export function relatedGoalFor(
  goals: SpecialistGoal[],
  specialistId: SpecialistId,
): SpecialistGoal | null {
  const types = GOAL_TYPES[specialistId];
  const active = goals.filter((goal) => goal.status === "active");
  return active.find((goal) => types.includes(goal.goalType)) ?? null;
}

function sampleFor(facts: SpecialistFacts, specialistId: SpecialistId): EvidenceSample {
  if (specialistId === "advertising" || specialistId === "email" || specialistId === "social") {
    return { elapsedDays: 0, observations: 0, conversions: 0 };
  }
  if (specialistId === "seo" && !facts.seoCheckedAt) {
    return { elapsedDays: 0, observations: 0, conversions: 0 };
  }
  return facts.evidenceSample;
}

function leaveAlone(
  href: string,
  title: string,
  body: string,
): SpecialistRecommend {
  return {
    kind: "no_change_yet",
    classification: "optimization",
    title,
    body,
    href,
  };
}

function seoReport(facts: SpecialistFacts, goal: SpecialistGoal | null): SpecialistReport {
  const policy = policyFor(facts.policies, "seo");
  const sample = sampleFor(facts, "seo");
  const verdict = evidenceRecommendation(sample, policy);
  const goalLine = goal
    ? `This relates to “${goal.title}.”`
    : "No visibility or traffic Goal is active yet.";

  const read = facts.seoCheckedAt
    ? `Last SEO check scored ${facts.seoScore} out of 100${facts.seoSummary ? ` — ${facts.seoSummary}` : "."} ${facts.seoFailCount} blocking item${facts.seoFailCount === 1 ? "" : "s"}, ${facts.seoWarnCount} item${facts.seoWarnCount === 1 ? "" : "s"} to improve. Search Console is ${facts.searchConsoleConnected ? "connected (read-only)" : "not connected"}.`
    : "No SEO check has been saved yet. GroovGro has not changed any page.";

  let analyze = `${goalLine} SEO waits ${policy.minElapsedDays} days and enough outcomes before an optimization change.`;
  if (verdict === "no_change_yet" && facts.seoCheckedAt) {
    analyze += ` The waiting threshold is not met (${sample.elapsedDays} days, ${sample.observations} observations, ${sample.conversions} conversions).`;
  }

  let recommend: SpecialistRecommend;
  if (!facts.seoCheckedAt) {
    recommend = {
      kind: "recommend",
      classification: "operational",
      title: "Run an SEO check",
      body: "Open SEO and check the connected homepage. GroovGro will not edit the website.",
      href: "/app/seo",
    };
  } else if (facts.seoFailCount > 0) {
    recommend = {
      kind: "recommend",
      classification: "operational",
      title: "Fix blocking SEO items",
      body: "Open SEO and work through the blocking items. Approve drafts there. GroovGro will not change the connected website from this page.",
      href: "/app/seo",
    };
  } else if (verdict === "change_allowed" && facts.seoWarnCount > 0) {
    recommend = {
      kind: "recommend",
      classification: "optimization",
      title: "Improve the page when you have time",
      body: "The waiting threshold is met and the page has items to make clearer. Review them on SEO. Do not start ads from this recommendation.",
      href: "/app/seo",
    };
  } else {
    recommend = leaveAlone(
      "/app/seo",
      "Leave SEO alone",
      "There is not enough evidence — or the page is in a good starting place — to change SEO this period. Keep collecting outcomes.",
    );
  }

  return {
    id: "seo",
    name: NAMES.seo,
    mode: "read_analyze_recommend",
    available: true,
    relatedGoal: goal ? { id: goal.id, title: goal.title, goalType: goal.goalType } : null,
    read,
    analyze,
    recommend,
    executeAllowed: false,
  };
}

function websiteReport(facts: SpecialistFacts, goal: SpecialistGoal | null): SpecialistReport {
  const policy = policyFor(facts.policies, "website");
  const verdict = evidenceRecommendation(sampleFor(facts, "website"), policy);
  const goalLine = goal
    ? `This relates to “${goal.title}.”`
    : "No traffic or conversion Goal is active yet.";

  if (!facts.websiteConnected) {
    return {
      id: "website",
      name: NAMES.website,
      mode: "read_analyze_recommend",
      available: true,
      relatedGoal: goal ? { id: goal.id, title: goal.title, goalType: goal.goalType } : null,
      read: "No existing website is connected, so visits cannot be recorded.",
      analyze: `${goalLine} Connecting the site you already have is an operational step, not a redesign.`,
      recommend: {
        kind: "recommend",
        classification: "operational",
        title: CONNECT_WEBSITE_STEP_TITLE,
        body: "Paste the tracking snippet on the site you already have. Do not move the site into GroovGro.",
        href: "/app/website",
      },
      executeAllowed: false,
    };
  }

  return {
    id: "website",
    name: NAMES.website,
    mode: "read_analyze_recommend",
    available: true,
    relatedGoal: goal ? { id: goal.id, title: goal.title, goalType: goal.goalType } : null,
    read: `The connected website is ${facts.websiteUrl}. GroovGro records visits. It does not replace that site.`,
    analyze: `${goalLine} Website and conversion changes wait ${policy.minElapsedDays} days and ${policy.minObservations} observations. ${
      verdict === "no_change_yet"
        ? "That threshold is not met."
        : "The threshold is met, which still does not mean the site should be redesigned."
    }`,
    recommend: leaveAlone(
      "/app/website",
      "Leave the website alone",
      "Keep the snippet in place. Do not rebuild or overwrite the connected website from GroovGro.",
    ),
    executeAllowed: false,
  };
}

function crmReport(facts: SpecialistFacts, goal: SpecialistGoal | null): SpecialistReport {
  const goalLine = goal
    ? `This relates to “${goal.title}” (${goal.liveNote || `${goal.liveCurrentValue}${goal.targetValue != null ? ` / ${goal.targetValue}` : ""}`}).`
    : "No lead-generation Goal is active yet.";

  return {
    id: "crm",
    name: NAMES.crm,
    mode: "read_analyze_recommend",
    available: true,
    relatedGoal: goal ? { id: goal.id, title: goal.title, goalType: goal.goalType } : null,
    read: `${facts.openLeadCount} open lead${facts.openLeadCount === 1 ? "" : "s"} in this workspace.`,
    analyze: `${goalLine} GroovGro can see the pipeline. It cannot email people.`,
    recommend:
      facts.openLeadCount > 0
        ? {
            kind: "recommend",
            classification: "operational",
            title: FOLLOW_UP_LEADS_STEP_TITLE,
            body: "Open Leads & customers and give each open lead a next step. GroovGro will not email them.",
            href: "/app/crm",
          }
        : leaveAlone(
            "/app/crm",
            "Leave the pipeline alone",
            "There are no open leads that need a next step right now.",
          ),
    executeAllowed: false,
  };
}

function availabilityReport(
  facts: SpecialistFacts,
  goal: SpecialistGoal | null,
): SpecialistReport {
  const policy = policyFor(facts.policies, "default");
  const verdict = evidenceRecommendation(facts.evidenceSample, policy);
  const behind =
    goal != null &&
    goal.targetValue != null &&
    goal.targetValue > 0 &&
    (goal.progressPercent ?? 0) < 25;
  const goalLine = goal
    ? `This relates to “${goal.title}” — ${goal.liveNote || `${goal.liveCurrentValue} of ${goal.targetValue ?? "—"}`}.`
    : "No utilization or registration Goal is active yet.";

  let recommend: SpecialistRecommend;
  if (facts.upcomingEventCount === 0 && !goal) {
    recommend = leaveAlone(
      "/app/events",
      "Leave the schedule alone",
      "There are no upcoming scheduled items and no related Goal. Add a calendar item only if that is how this business sells.",
    );
  } else if (behind && verdict === "change_allowed") {
    recommend = {
      kind: "recommend",
      classification: "optimization",
      title: "Review the schedule or how people find it",
      body: `${goal?.title ?? "The Goal"} is well short of its target. Review upcoming items and the related Offer. GroovGro will not change ads or the website.`,
      href: "/app/events",
    };
  } else {
    recommend = leaveAlone(
      "/app/events",
      "Leave the schedule alone",
      "Keep collecting bookings. There is not enough evidence to change the schedule this period.",
    );
  }

  return {
    id: "availability",
    name: NAMES.availability,
    mode: "read_analyze_recommend",
    available: true,
    relatedGoal: goal ? { id: goal.id, title: goal.title, goalType: goal.goalType } : null,
    read: `${facts.upcomingEventCount} upcoming scheduled item${facts.upcomingEventCount === 1 ? "" : "s"}.`,
    analyze: `${goalLine} Availability is a constraint, not a product type.`,
    recommend,
    executeAllowed: false,
  };
}

function disconnectedReport(
  id: Extract<SpecialistId, "advertising" | "email" | "social">,
  facts: SpecialistFacts,
  goal: SpecialistGoal | null,
): SpecialistReport {
  const channel = CHANNEL[id];
  const policy = policyFor(facts.policies, channel);
  const connected =
    id === "advertising"
      ? facts.advertisingConnected
      : id === "email"
        ? facts.emailConnected
        : facts.socialConnected;
  const noun = id === "advertising" ? "ads" : id === "email" ? "email" : "social posts";

  return {
    id,
    name: NAMES[id],
    mode: "read_analyze_recommend",
    available: connected,
    relatedGoal: goal ? { id: goal.id, title: goal.title, goalType: goal.goalType } : null,
    read: connected
      ? `${labelFor(id)} is marked connected. GroovGro still cannot execute ${noun}.`
      : `${labelFor(id)} is not connected. GroovGro has no ${noun} capability in this workspace.`,
    analyze: goal
      ? `“${goal.title}” is not a reason to start ${noun}. This channel waits ${policy.minElapsedDays} days and ${policy.minObservations} observations of its own outcomes.`
      : `Starting ${noun} would be a later, strategic change. There is no provider evidence yet.`,
    recommend: leaveAlone(
      "/app/integrations",
      `Do not start ${noun}`,
      `Leave ${labelFor(id)} alone. GroovGro will not buy ads, send email, or publish social posts.`,
    ),
    executeAllowed: false,
  };
}

export function buildSpecialistReports(facts: SpecialistFacts): SpecialistReport[] {
  return [
    seoReport(facts, relatedGoalFor(facts.goals, "seo")),
    websiteReport(facts, relatedGoalFor(facts.goals, "website")),
    crmReport(facts, relatedGoalFor(facts.goals, "crm")),
    availabilityReport(facts, relatedGoalFor(facts.goals, "availability")),
    disconnectedReport("advertising", facts, relatedGoalFor(facts.goals, "advertising")),
    disconnectedReport("email", facts, relatedGoalFor(facts.goals, "email")),
    disconnectedReport("social", facts, relatedGoalFor(facts.goals, "social")),
  ];
}

export function specialistById(
  reports: SpecialistReport[],
  id: string,
): SpecialistReport | null {
  return reports.find((row) => row.id === id) ?? null;
}
