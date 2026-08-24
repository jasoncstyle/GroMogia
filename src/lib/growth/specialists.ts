import { DEFAULT_EVIDENCE_POLICIES, evidenceRecommendation, labelFor } from "@/lib/growth/types";
import type { EvidencePolicy, EvidenceSample } from "@/lib/growth/types";
import { CONNECT_SEARCH_CONSOLE_STEP_TITLE, CONNECT_WEBSITE_STEP_TITLE, DRAFT_BRAND_VOICE_STEP_TITLE, FIX_SEO_STEP_TITLE, FOLLOW_UP_LEADS_STEP_TITLE, IMPROVE_SEO_STEP_TITLE, PASTE_SNIPPET_STEP_TITLE, PICK_SEARCH_CONSOLE_STEP_TITLE, REFRESH_SEARCH_CONSOLE_STEP_TITLE, REVIEW_SCHEDULE_STEP_TITLE, RUN_SEO_STEP_TITLE, ADD_BRAND_VOICE_EXAMPLE_STEP_TITLE, ADD_OFFER_STEP_TITLE, SAVE_BRAND_STEP_TITLE, SAVE_BRAND_VOICE_STEP_TITLE, SAVE_BUSINESS_STEP_TITLE, SHARE_LEAD_FORM_STEP_TITLE } from "@/lib/growth/plan-draft";

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
  searchConsoleProperty: boolean
  searchConsoleSnapshot: boolean
  searchConsoleSnapshotAt: Date | null
  openLeadCount: number
  contactCount: number
  recordedVisitCount: number
  brandVoiceSaved: boolean
  brandVoiceExampleSaved: boolean
  brandVoiceDraftSaved: boolean
  brandSettingsSaved: boolean
  businessBrainSaved: boolean
  confirmedOfferCount: number
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

export const SEARCH_CONSOLE_REFRESH_AFTER_DAYS = 7;

function searchConsoleSnapshotStale(facts: SpecialistFacts): boolean {
  if (!facts.searchConsoleSnapshotAt) return false;
  const ageMs = facts.now.getTime() - facts.searchConsoleSnapshotAt.getTime();
  return ageMs >= SEARCH_CONSOLE_REFRESH_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

function searchConsoleNeedsRefresh(facts: SpecialistFacts): boolean {
  return (
    facts.searchConsoleConnected &&
    facts.searchConsoleProperty &&
    (!facts.searchConsoleSnapshot || searchConsoleSnapshotStale(facts))
  );
}

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
    ? `Last SEO check scored ${facts.seoScore} out of 100${facts.seoSummary ? ` — ${facts.seoSummary}` : "."} ${facts.seoFailCount} blocking item${facts.seoFailCount === 1 ? "" : "s"}, ${facts.seoWarnCount} item${facts.seoWarnCount === 1 ? "" : "s"} to improve. Search Console is ${
        !facts.searchConsoleConnected
          ? "not connected"
          : facts.searchConsoleProperty
            ? "connected (read-only)"
            : "connected, but no property is chosen yet"
      }.`
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
      title: RUN_SEO_STEP_TITLE,
      body: "Check the connected homepage here. GroovGro will not edit the website.",
      href: "/app/seo",
    };
  } else if (facts.seoFailCount > 0) {
    recommend = {
      kind: "recommend",
      classification: "operational",
      title: FIX_SEO_STEP_TITLE,
      body: "Draft and approve the blocking items here. GroovGro will not change the connected website.",
      href: "/app/seo",
    };
  } else if (verdict === "change_allowed" && facts.seoWarnCount > 0) {
    recommend = {
      kind: "recommend",
      classification: "optimization",
      title: IMPROVE_SEO_STEP_TITLE,
      body: "The waiting threshold is met and the page has items to make clearer. Draft and approve that copy here. GroovGro will not change the connected website or start ads.",
      href: "/app/seo",
    };
  } else if (
    facts.websiteConnected &&
    !facts.searchConsoleConnected
  ) {
    recommend = {
      kind: "recommend",
      classification: "optimization",
      title: CONNECT_SEARCH_CONSOLE_STEP_TITLE,
      body: "Connect Search Console here so GroovGro can read search numbers. GroovGro will not edit the website, submit a sitemap, or buy ads.",
      href: "/app/seo",
    };
  } else if (facts.searchConsoleConnected && !facts.searchConsoleProperty) {
    recommend = {
      kind: "recommend",
      classification: "optimization",
      title: PICK_SEARCH_CONSOLE_STEP_TITLE,
      body: "Google is connected. Choose the Search Console property here so GroovGro can read search numbers. GroovGro will not edit the website, submit a sitemap, or buy ads.",
      href: "/app/seo",
    };
  } else if (searchConsoleNeedsRefresh(facts)) {
    recommend = {
      kind: "recommend",
      classification: "optimization",
      title: REFRESH_SEARCH_CONSOLE_STEP_TITLE,
      body: facts.searchConsoleSnapshot
        ? "The stored Search Console numbers are more than a week old. Refresh here so GroovGro can read the latest search numbers. GroovGro will not edit the website, submit a sitemap, or buy ads."
        : "The Search Console property is saved. Refresh here so GroovGro can read the latest search numbers. GroovGro will not edit the website, submit a sitemap, or buy ads.",
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

function websiteRecommend(facts: SpecialistFacts): SpecialistRecommend {
  if (facts.recordedVisitCount === 0) {
    return {
      kind: "recommend",
      classification: "optimization",
      title: PASTE_SNIPPET_STEP_TITLE,
      body: "Copy the tracking snippet here and paste it on the site you already have. GroovGro does not replace that site.",
      href: "/app/website",
    };
  }
  if (!facts.brandSettingsSaved) {
    return {
      kind: "recommend",
      classification: "strategic",
      title: SAVE_BRAND_STEP_TITLE,
      body: "Save the business name, what it does, and who it serves here. GroovGro will not start marketing, send email, or edit the live website.",
      href: "/app/settings/brand",
    };
  }
  if (!facts.businessBrainSaved) {
    return {
      kind: "recommend",
      classification: "strategic",
      title: SAVE_BUSINESS_STEP_TITLE,
      body: "Save the kind of business this is and how it creates value. GroovGro will not start marketing, send email, or edit the live website.",
      href: "/app/business",
    };
  }
  if (facts.confirmedOfferCount === 0) {
    return {
      kind: "recommend",
      classification: "strategic",
      title: ADD_OFFER_STEP_TITLE,
      body: "Name something this business promotes or wants a customer to do. GroovGro will not start marketing.",
      href: "/app/offers",
    };
  }
  if (!facts.brandVoiceSaved) {
    return {
      kind: "recommend",
      classification: "strategic",
      title: SAVE_BRAND_VOICE_STEP_TITLE,
      body: "Save how this business sounds here. GroovGro uses this for drafts. It will not send email, post to social, or edit the live website.",
      href: "/app/brand-voice",
    };
  }
  if (!facts.brandVoiceExampleSaved) {
    return {
      kind: "recommend",
      classification: "strategic",
      title: ADD_BRAND_VOICE_EXAMPLE_STEP_TITLE,
      body: "Paste writing you already like here. GroovGro uses this for drafts. It will not send email, post to social, or edit the live website.",
      href: "/app/brand-voice",
    };
  }
  if (!facts.brandVoiceDraftSaved) {
    return {
      kind: "recommend",
      classification: "strategic",
      title: DRAFT_BRAND_VOICE_STEP_TITLE,
      body: "Create a draft here from the voice you saved. GroovGro keeps it in this workspace. It will not send email, post to social, or edit the live website.",
      href: "/app/brand-voice",
    };
  }
  return leaveAlone(
    "/app/website",
    "Leave the website alone",
    "Keep the snippet in place. Do not rebuild or overwrite the connected website from GroovGro.",
  );
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
    read: `The connected website is ${facts.websiteUrl}. ${
      facts.recordedVisitCount > 0
        ? "GroovGro has recorded visits."
        : "GroovGro has not recorded visits yet."
    } It does not replace that site.`,
    analyze: `${goalLine} Website and conversion changes wait ${policy.minElapsedDays} days and ${policy.minObservations} observations. ${
      verdict === "no_change_yet"
        ? "That threshold is not met."
        : "The threshold is met, which still does not mean the site should be redesigned."
    }`,
    recommend: websiteRecommend(facts),
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
    read: `${facts.openLeadCount} open lead${facts.openLeadCount === 1 ? "" : "s"} in this workspace.${
      facts.contactCount === 0 ? " GroovGro has not captured a person yet." : ""
    }`,
    analyze: `${goalLine} GroovGro can see the pipeline. It cannot email people.`,
    recommend:
      facts.openLeadCount > 0
        ? {
            kind: "recommend",
            classification: "operational",
            title: FOLLOW_UP_LEADS_STEP_TITLE,
            body: "Give each open lead a next step here. GroovGro will not email them.",
            href: "/app/crm",
          }
        : facts.contactCount === 0 && facts.websiteConnected
          ? {
              kind: "recommend",
              classification: "optimization",
              title: SHARE_LEAD_FORM_STEP_TITLE,
              body: "Copy the public lead form here, or add someone you already know. GroovGro will not email anyone.",
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
      title: REVIEW_SCHEDULE_STEP_TITLE,
      body: `${goal?.title ?? "The Goal"} is well short of its target. Review upcoming items here. Add a calendar item if that is how this business sells. GroovGro will not change ads or the website.`,
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
