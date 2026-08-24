import {
  evidenceRecommendation,
  labelFor,
  type EvidencePolicy,
  type EvidenceSample,
} from "@/lib/growth/types";

export const REVIEW_KINDS = ["weekly", "monthly"] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export type ReviewGoal = {
  id: string
  title: string
  status: string
  goalType: string
  liveCurrentValue: number
  targetValue: number | null
  progressPercent: number | null
  liveNote: string
  discoveryStatus: string
};

export type ReviewOffer = {
  name: string
  discoveryStatus: string
};

export type ReviewDecision = {
  decisionType: string
  recommendation: string
  createdAt: Date
};

export type ReviewPolicy = EvidencePolicy & {
  channel: string
  notes?: string
};

export type ReviewSettings = {
  reviewFrequency: string
  reviewDay: string
  reviewTime: string
  timezone: string
};

export type ReviewActivity = {
  createdAt: Date
};

export type ReviewPayment = {
  createdAt: Date
  amountCents: number
  kind: string
};

export type ReviewInput = {
  now: Date
  kind: ReviewKind
  goals: ReviewGoal[]
  offers: ReviewOffer[]
  decisions: ReviewDecision[]
  policies: ReviewPolicy[]
  settings: ReviewSettings | null
  leads: ReviewActivity[]
  bookings: ReviewActivity[]
  payments: ReviewPayment[]
};

export type ReviewRecommendation = {
  kind: "no_change_yet" | "recommend"
  classification: "operational" | "optimization" | "strategic"
  title: string
  recommendation: string
  rationale: string
  evidence: string
  evidenceWindow: string
  confidence: number
  goalId: string | null
};

export type EvidenceCheck = {
  channel: string
  verdict: "change_allowed" | "no_change_yet"
  sample: EvidenceSample
  reason: string
};

export type GrowthReview = {
  kind: ReviewKind
  generatedAt: Date
  periodLabel: string
  periodDays: number
  headline: string
  summary: string
  whatChanged: string
  howWeAreDoing: string
  whatNeedsAttention: string
  whatShouldHappenNext: string
  whatIsLeftAlone: string
  strategyNote: string
  nextScheduledLabel: string
  recommendations: ReviewRecommendation[]
  evidenceChecks: EvidenceCheck[]
  primary: ReviewRecommendation
};

const MS_DAY = 24 * 60 * 60 * 1000;

export function reviewPeriod(kind: ReviewKind, now: Date) {
  const days = kind === "monthly" ? 30 : 7;
  const end = now;
  const start = new Date(now.getTime() - days * MS_DAY);
  const priorEnd = start;
  const priorStart = new Date(start.getTime() - days * MS_DAY);
  const periodLabel =
    kind === "weekly"
      ? `Week of ${start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`
      : now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { days, start, end, priorStart, priorEnd, periodLabel };
}

function inRange(date: Date, start: Date, end: Date) {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function countBetween(items: ReviewActivity[], start: Date, end: Date) {
  return items.filter((item) => inRange(item.createdAt, start, end)).length;
}

export function describeCountChange(
  current: number,
  prior: number,
  singular: string,
  plural: string,
): string {
  const noun = current === 1 ? singular : plural;
  if (current === 0 && prior === 0) {
    return `No ${plural} in this period or the one before.`;
  }
  if (prior === 0) {
    return `${current} ${noun} this period. None in the period before.`;
  }
  if (current === prior) {
    return `${current} ${noun} this period, the same as the period before.`;
  }
  if (current > prior) {
    return `${current} ${noun} this period, up from ${prior} before.`;
  }
  return `${current} ${noun} this period, down from ${prior} before.`;
}

function describePaymentChange(current: number, prior: number): string {
  if (current === 0 && prior === 0) {
    return "No connected payments in this period or the one before.";
  }
  if (prior === 0) {
    return `${current} dollars in connected payments this period. None in the period before.`;
  }
  if (current === prior) {
    return `${current} dollars in connected payments this period, the same as the period before.`;
  }
  if (current > prior) {
    return `${current} dollars in connected payments this period, up from ${prior} before.`;
  }
  return `${current} dollars in connected payments this period, down from ${prior} before.`;
}

function dollarsBetween(payments: ReviewPayment[], start: Date, end: Date) {
  return Math.round(
    payments
      .filter(
        (payment) =>
          payment.kind !== "refund" && inRange(payment.createdAt, start, end),
      )
      .reduce((sum, payment) => sum + Math.max(0, payment.amountCents), 0) / 100,
  );
}

export function connectedEvidenceSample(
  input: Pick<ReviewInput, "now" | "leads" | "bookings" | "payments">,
): EvidenceSample {
  const stamps = [
    ...input.leads.map((row) => row.createdAt),
    ...input.bookings.map((row) => row.createdAt),
    ...input.payments.map((row) => row.createdAt),
  ];
  if (stamps.length === 0) {
    return { elapsedDays: 0, observations: 0, conversions: 0 };
  }
  const earliest = Math.min(...stamps.map((date) => date.getTime()));
  const elapsedDays = Math.max(
    0,
    Math.floor((input.now.getTime() - earliest) / MS_DAY),
  );
  return {
    elapsedDays,
    observations: input.leads.length + input.bookings.length,
    conversions:
      input.bookings.length +
      input.payments.filter((payment) => payment.kind !== "refund").length,
  };
}

export function evidenceChecks(input: ReviewInput): EvidenceCheck[] {
  const policies =
    input.policies.length > 0
      ? input.policies
      : [{ channel: "default", minElapsedDays: 7, minObservations: 20, minConversions: 5 }];
  const connected = connectedEvidenceSample(input);

  return policies.map((policy) => {
    const sample =
      policy.channel === "default"
        ? connected
        : { elapsedDays: 0, observations: 0, conversions: 0 };
    const verdict = evidenceRecommendation(sample, policy);
    const name = labelFor(policy.channel);
    const reason =
      policy.channel !== "default" && sample.observations === 0
        ? `${name} is not connected with its own outcomes yet. Leave that channel alone.`
        : verdict === "no_change_yet"
          ? `${name} still needs ${policy.minElapsedDays} days, ${policy.minObservations} observations, and ${policy.minConversions} conversions. GroovGro has ${sample.elapsedDays} days, ${sample.observations} observations, and ${sample.conversions} conversions.`
          : `The waiting threshold for ${name} is met. That still does not mean GroovGro should change anything.`;
    return { channel: policy.channel, verdict, sample, reason };
  });
}

export function nextScheduledReview(
  settings: ReviewSettings,
  now: Date,
): Date | null {
  const [hoursText, minutesText] = settings.reviewTime.split(":");
  const hours = Number.parseInt(hoursText ?? "10", 10);
  const minutes = Number.parseInt(minutesText ?? "0", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const targetDay = settings.reviewDay.toLowerCase();
  for (let offset = 0; offset < 60; offset += 1) {
    const day = new Date(now.getTime() + offset * MS_DAY);
    const weekday = day
      .toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: settings.timezone || "UTC",
      })
      .toLowerCase();
    if (weekday !== targetDay) continue;

    const candidate = new Date(day);
    candidate.setUTCHours(hours, minutes, 0, 0);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  return null;
}

export function scheduledReviewLabel(
  settings: ReviewSettings | null,
  now: Date,
): string {
  if (!settings) {
    return "Set a review day on Next step if you want a reminder of when to look. GroovGro will not change the business on that day.";
  }
  const next = nextScheduledReview(settings, now);
  const when = next
    ? `${next.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      })} at ${settings.reviewTime}`
    : `${labelFor(settings.reviewDay)} at ${settings.reviewTime}`;
  return `Next scheduled ${labelFor(settings.reviewFrequency)} look: ${when} (${settings.timezone}). That time is for you to read this page. GroovGro will not change the business then.`;
}

function noChangeRecommendation(
  enoughDefault: boolean,
  onTrack: boolean,
  periodLabel: string,
): ReviewRecommendation {
  return {
    kind: "no_change_yet",
    classification: "optimization",
    title: "Leave the plan alone",
    recommendation: enoughDefault && onTrack
      ? "Goals are moving. Keep collecting evidence. Do not change course this period."
      : "There is not enough evidence to change the plan. Keep collecting outcomes.",
    rationale:
      "New data is not a reason to act. Waiting is a valid Growth Review result.",
    evidence: enoughDefault
      ? "Connected outcomes exist, but the plan does not need a change this period."
      : "Connected leads, bookings, and payments have not met the default waiting threshold.",
    evidenceWindow: periodLabel,
    confidence: enoughDefault ? 70 : 85,
    goalId: null,
  };
}

export function generateGrowthReview(input: ReviewInput): GrowthReview {
  const period = reviewPeriod(input.kind, input.now);
  const checks = evidenceChecks(input);
  const defaultCheck = checks.find((row) => row.channel === "default");
  const enoughDefault = defaultCheck?.verdict === "change_allowed";

  const inferredOffers = input.offers.filter(
    (offer) => offer.discoveryStatus === "inferred",
  );
  const inferredGoals = input.goals.filter(
    (goal) => goal.discoveryStatus === "inferred",
  );
  const activeGoals = input.goals.filter((goal) => goal.status === "active");
  const draftCount = inferredOffers.length + inferredGoals.length;

  const achieved = activeGoals.filter(
    (goal) =>
      goal.targetValue != null &&
      goal.targetValue > 0 &&
      goal.liveCurrentValue >= goal.targetValue,
  );
  const behind = activeGoals.filter((goal) => {
    if (goal.targetValue == null || goal.targetValue <= 0) return false;
    return (goal.progressPercent ?? 0) < 25;
  });
  const onTrack = activeGoals.filter((goal) => (goal.progressPercent ?? 0) >= 40);

  const recommendations: ReviewRecommendation[] = [];

  if (draftCount > 0) {
    recommendations.push({
      kind: "recommend",
      classification: "operational",
      title: "Confirm or reject drafts",
      recommendation: `Open Next step to confirm or reject ${draftCount} suggested offer${draftCount === 1 ? "" : "s or goals"}. Nothing becomes active until you do.`,
      rationale:
        "GroovGro drafted these from connected data. It will not activate them or change marketing for you.",
      evidence: `${inferredOffers.length} suggested offer${inferredOffers.length === 1 ? "" : "s"} and ${inferredGoals.length} suggested goal${inferredGoals.length === 1 ? "" : "s"} are waiting.`,
      evidenceWindow: period.periodLabel,
      confidence: 90,
      goalId: null,
    });
  }

  if (activeGoals.length === 0 && inferredGoals.length === 0) {
    recommendations.push({
      kind: "recommend",
      classification: "operational",
      title: "Name a Goal",
      recommendation:
        "Open Next step to add a measurable Goal so weekly and monthly reviews have something to compare against.",
      rationale:
        "Without an active Goal, GroovGro can report activity but cannot judge progress.",
      evidence: "No active Growth Goal is recorded.",
      evidenceWindow: period.periodLabel,
      confidence: 80,
      goalId: null,
    });
  }

  if (input.kind === "monthly" && achieved.length > 0) {
    const goal = achieved[0];
    recommendations.push({
      kind: "recommend",
      classification: "strategic",
      title: "A Goal looks reached",
      recommendation: `${goal.title} looks reached. Open Next step to confirm that and choose the next outcome. Do not start ads or automation from this review.`,
      rationale:
        "A monthly review is the right time to ask whether the objective is done, not to change channels.",
      evidence: `${goal.liveCurrentValue}${goal.targetValue != null ? ` / ${goal.targetValue}` : ""}${goal.liveNote ? ` · ${goal.liveNote}` : ""}`,
      evidenceWindow: period.periodLabel,
      confidence: 75,
      goalId: goal.id,
    });
  }

  if (enoughDefault && behind.length > 0 && achieved.length === 0) {
    const goal = behind[0];
    recommendations.push({
      kind: "recommend",
      classification: "optimization",
      title: "A Goal is far behind",
      recommendation: `${goal.title} is well short of its target. Review the offer, the schedule, or how people find it. GroovGro will not change ads, email, or the website.`,
      rationale:
        "There is enough connected evidence to notice the gap. Noticing is not the same as executing a marketing change.",
      evidence: goal.liveNote || `${goal.liveCurrentValue} toward ${goal.targetValue}`,
      evidenceWindow: period.periodLabel,
      confidence: 60,
      goalId: goal.id,
    });
  }

  if (!recommendations.some((row) => row.kind === "no_change_yet")) {
    recommendations.push(
      noChangeRecommendation(Boolean(enoughDefault), onTrack.length > 0, period.periodLabel),
    );
  }

  const operational = recommendations.find(
    (row) => row.kind === "recommend" && row.classification === "operational",
  );
  const strategic = recommendations.find((row) => row.classification === "strategic");
  const optimization = recommendations.find(
    (row) => row.kind === "recommend" && row.classification === "optimization",
  );
  const leaveAlone = recommendations.find((row) => row.kind === "no_change_yet");
  const primary =
    operational ?? strategic ?? optimization ?? leaveAlone ?? recommendations[0];

  const leadsNow = countBetween(input.leads, period.start, period.end);
  const leadsPrior = countBetween(input.leads, period.priorStart, period.priorEnd);
  const bookingsNow = countBetween(input.bookings, period.start, period.end);
  const bookingsPrior = countBetween(
    input.bookings,
    period.priorStart,
    period.priorEnd,
  );
  const dollarsNow = dollarsBetween(input.payments, period.start, period.end);
  const dollarsPrior = dollarsBetween(
    input.payments,
    period.priorStart,
    period.priorEnd,
  );
  const periodDecisions = input.decisions.filter((row) =>
    inRange(row.createdAt, period.start, period.end),
  );
  const decisionLine =
    periodDecisions.length === 0
      ? "No Decision History entries this period."
      : periodDecisions[0].decisionType === "no_change"
        ? `Last recorded decision was to leave something unchanged: ${periodDecisions[0].recommendation}`
        : `${periodDecisions.length} decision${periodDecisions.length === 1 ? "" : "s"} recorded this period.`;

  const whatChanged = [
    describeCountChange(leadsNow, leadsPrior, "lead", "leads"),
    describeCountChange(bookingsNow, bookingsPrior, "booking", "bookings"),
    describePaymentChange(dollarsNow, dollarsPrior),
    decisionLine,
  ].join(" ");

  const howWeAreDoing =
    activeGoals.length > 0
      ? activeGoals
          .map((goal) =>
            goal.progressPercent != null
              ? `${goal.title} is at ${goal.liveCurrentValue}${goal.targetValue != null ? ` of ${goal.targetValue}` : ""} (${goal.progressPercent}%).`
              : `${goal.title}: ${goal.liveNote || "progress is recorded by hand."}`,
          )
          .join(" ")
      : inferredGoals.length > 0
        ? "Suggested Goals are waiting. Open Next step to confirm them. None are active yet."
        : "No active Goal, so this review can only describe activity, not progress.";

  const attentionParts: string[] = [];
  if (draftCount > 0) {
    attentionParts.push("Suggested Offers or Goals are waiting. Open Next step to confirm or reject.");
  }
  if (activeGoals.length === 0 && inferredGoals.length === 0) {
    attentionParts.push("There is no active Goal. Open Next step to add one.");
  }
  if (behind.length > 0) {
    attentionParts.push(`${behind[0].title} is far behind its target.`);
  }
  if (achieved.length > 0 && input.kind === "monthly") {
    attentionParts.push(`${achieved[0].title} looks reached.`);
  }
  const whatNeedsAttention =
    attentionParts.length > 0
      ? attentionParts.join(" ")
      : "Nothing urgent. Continue observing.";

  const whatShouldHappenNext = `${primary.recommendation} GroovGro will not execute marketing from this review.`;

  const untouchedChannels = checks
    .filter((row) => row.channel !== "default")
    .map((row) => labelFor(row.channel));
  const whatIsLeftAlone = [
    leaveAlone?.recommendation ??
      "Ads, email, social, and SEO are left alone until those channels have their own evidence.",
    untouchedChannels.length > 0
      ? `Channels left untouched: ${untouchedChannels.join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const headline = operational
    ? "Review suggested Offers and Goals. Do not change marketing yet."
    : strategic
      ? "A Goal looks reached. Decide what comes next."
      : optimization
        ? "One Goal is behind. Review the offer or how people find it — do not run ads from here."
        : input.kind === "monthly"
          ? "No strategy change this month. Keep collecting evidence."
          : "Leave this week alone. Keep collecting evidence.";

  const summary =
    input.kind === "monthly"
      ? `This is a monthly strategy review for ${period.periodLabel}. It asks whether the Goals are still right and whether there is enough evidence to change course. It does not run marketing.`
      : `This is a weekly growth review for ${period.periodLabel}. It reports what changed and whether to leave the plan alone. It does not run marketing.`;

  const strategyNote =
    input.kind === "monthly"
      ? activeGoals.length > 0
        ? `Active Goals to keep or replace: ${activeGoals.map((goal) => goal.title).join("; ")}.`
        : "A monthly review without an active Goal cannot judge strategy. Open Next step to confirm or add a Goal first."
      : "Weekly reviews stay operational. Use the monthly review to ask whether the Goals themselves are still right.";

  return {
    kind: input.kind,
    generatedAt: input.now,
    periodLabel: period.periodLabel,
    periodDays: period.days,
    headline,
    summary,
    whatChanged,
    howWeAreDoing,
    whatNeedsAttention,
    whatShouldHappenNext,
    whatIsLeftAlone,
    strategyNote,
    nextScheduledLabel: scheduledReviewLabel(input.settings, input.now),
    recommendations,
    evidenceChecks: checks,
    primary,
  };
}

export function reviewInputFromSnapshot(
  kind: ReviewKind,
  snapshot: {
    goals: ReviewGoal[]
    offers: ReviewOffer[]
    decisions: ReviewDecision[]
    policies: ReviewPolicy[]
    settings: ReviewSettings | null
    leads: ReviewActivity[]
    bookings: ReviewActivity[]
    payments: ReviewPayment[]
  },
  now = new Date(),
): ReviewInput {
  return { now, kind, ...snapshot };
}
