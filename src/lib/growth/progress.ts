import { formatLeadOrigin } from "@/lib/marketing/named-link";
import { goalProgressPercent, isGoalAchieved } from "@/lib/growth/types";

export type ProgressLead = {
  createdAt: Date
  offerId: string | null
  source?: string
  campaign?: string
};

export type GoalShareRow = {
  origin: string
  count: number
};

export type GoalShareAttribution = {
  note: string
  rows: GoalShareRow[]
};

export type ProgressBooking = {
  createdAt: Date
  offerId: string | null
  eventId: string | null
  status: string
};

export type ProgressPayment = {
  createdAt: Date
  amountCents: number
  kind: string
  offerId: string | null
};

export type ProgressEvent = {
  id: string
  offerId: string | null
  startsAt: Date | null
  capacity: number | null
  status: string
};

export type ProgressFacts = {
  now: Date
  leads: ProgressLead[]
  bookings: ProgressBooking[]
  payments: ProgressPayment[]
  events: ProgressEvent[]
};

export type ProgressGoal = {
  goalType: string
  offerId: string | null
  startsOn: Date | null
  currentValue: number
  targetValue: number | null
  unit: string
};

export type LiveProgress = {
  currentValue: number
  progressPercent: number | null
  note: string
  computable: boolean
};

const FLOW_TYPES = new Set([
  "lead_generation",
  "revenue",
  "conversions",
  "registrations",
  "utilization",
  "traffic",
]);

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function defaultWindowStart(now: Date): Date {
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

export function progressWindowStart(goal: ProgressGoal, now: Date): Date {
  if (goal.startsOn) return goal.startsOn;
  return defaultWindowStart(now);
}

function matchesOffer(offerId: string | null, goalOfferId: string | null): boolean {
  if (!goalOfferId) return true;
  return offerId === goalOfferId;
}

function isOpenEvent(event: ProgressEvent, today: Date): boolean {
  if (event.status === "cancelled") return false;
  if (!event.startsAt) return event.status !== "completed";
  return event.startsAt.getTime() >= today.getTime();
}

function isConfirmedBooking(status: string): boolean {
  return status !== "cancelled" && status !== "refunded";
}

function inWindow(date: Date, start: Date, now: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= now.getTime();
}

export function liveGoalProgress(
  goal: ProgressGoal,
  facts: ProgressFacts,
): LiveProgress {
  if (!FLOW_TYPES.has(goal.goalType)) {
    return {
      currentValue: goal.currentValue,
      progressPercent: goalProgressPercent(goal.currentValue, goal.targetValue),
      note: "This goal type is updated by hand until more connected data exists.",
      computable: false,
    };
  }

  const windowStart = progressWindowStart(goal, facts.now);
  const today = startOfDay(facts.now);

  if (goal.goalType === "utilization") {
    const upcoming = facts.events.filter(
      (event) => isOpenEvent(event, today) && matchesOffer(event.offerId, goal.offerId),
    );
    const upcomingIds = new Set(upcoming.map((event) => event.id));
    const filled = facts.bookings.filter(
      (booking) =>
        isConfirmedBooking(booking.status) &&
        booking.eventId &&
        upcomingIds.has(booking.eventId),
    ).length;
    const capacity = upcoming.reduce((sum, event) => sum + (event.capacity ?? 0), 0);
    const note = capacity
      ? `${filled} of ${capacity} upcoming spots are filled from connected bookings.`
      : `${filled} connected booking${filled === 1 ? "" : "s"} on upcoming scheduled items.`;
    return {
      currentValue: filled,
      progressPercent: goalProgressPercent(filled, goal.targetValue),
      note,
      computable: true,
    };
  }

  if (goal.goalType === "revenue") {
    const dollars = Math.round(
      facts.payments
        .filter(
          (payment) =>
            payment.kind !== "refund" &&
            matchesOffer(payment.offerId, goal.offerId) &&
            inWindow(payment.createdAt, windowStart, facts.now),
        )
        .reduce((sum, payment) => sum + Math.max(0, payment.amountCents), 0) / 100,
    );
    return {
      currentValue: dollars,
      progressPercent: goalProgressPercent(dollars, goal.targetValue),
      note: `${dollars} dollars in connected payments since ${windowStart.toLocaleDateString()}.`,
      computable: true,
    };
  }

  if (goal.goalType === "lead_generation") {
    const count = facts.leads.filter(
      (lead) =>
        matchesOffer(lead.offerId, goal.offerId) &&
        inWindow(lead.createdAt, windowStart, facts.now),
    ).length;
    return {
      currentValue: count,
      progressPercent: goalProgressPercent(count, goal.targetValue),
      note: `${count} lead${count === 1 ? "" : "s"} in the connected window.`,
      computable: true,
    };
  }

  const bookings = facts.bookings.filter(
    (booking) =>
      isConfirmedBooking(booking.status) &&
      matchesOffer(booking.offerId, goal.offerId) &&
      inWindow(booking.createdAt, windowStart, facts.now),
  ).length;
  return {
    currentValue: bookings,
    progressPercent: goalProgressPercent(bookings, goal.targetValue),
    note: `${bookings} booking${bookings === 1 ? "" : "s"} in the connected window.`,
    computable: true,
  };
}

function matchingLeadWindow(goal: ProgressGoal, facts: ProgressFacts): ProgressLead[] {
  const windowStart = progressWindowStart(goal, facts.now);
  return facts.leads.filter(
    (lead) =>
      matchesOffer(lead.offerId, goal.offerId) &&
      inWindow(lead.createdAt, windowStart, facts.now),
  );
}

export function goalShareAttribution(
  goal: ProgressGoal,
  facts: ProgressFacts,
): GoalShareAttribution | null {
  if (goal.goalType !== "lead_generation") return null;
  const matching = matchingLeadWindow(goal, facts);
  if (matching.length === 0) return null;

  const counts = new Map<string, number>();
  for (const lead of matching) {
    const campaign = (lead.campaign ?? "").trim();
    if (!campaign) continue;
    const origin = formatLeadOrigin(lead.source ?? "", campaign);
    if (!origin) continue;
    counts.set(origin, (counts.get(origin) ?? 0) + 1);
  }
  const rows = [...counts.entries()]
    .map(([origin, count]) => ({ origin, count }))
    .sort((a, b) => b.count - a.count || a.origin.localeCompare(b.origin))
    .slice(0, 3);

  if (rows.length === 0) {
    return {
      note: "This Goal number does not yet name a share.",
      rows: [],
    };
  }

  const top = rows[0];
  const note =
    top.count === matching.length
      ? `This Goal number is from ${top.origin}.`
      : `${top.count} of ${matching.length} in this Goal number came from ${top.origin}.`;
  return { note, rows };
}

export function progressDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function planProgressSnapshot(input: {
  existingSameDay: boolean
  existingValue: number | null
  nextValue: number
}): "insert" | "update" | "skip" {
  if (!input.existingSameDay) return "insert";
  if (input.existingValue === input.nextValue) return "skip";
  return "update";
}

export function storedGoalFieldsFromLive(
  goal: {
    status: string
    completedAt: Date | null
    targetValue: number | null
  },
  liveValue: number,
  now: Date,
) {
  const achieved = isGoalAchieved(liveValue, goal.targetValue);
  const canMarkAchieved =
    achieved &&
    goal.status !== "cancelled" &&
    goal.status !== "missed" &&
    goal.status !== "paused";
  return {
    currentValue: liveValue,
    progressRecordedAt: now,
    status: canMarkAchieved ? "achieved" : goal.status,
    completedAt: canMarkAchieved
      ? (goal.completedAt ?? now)
      : goal.status === "achieved"
        ? goal.completedAt
        : null,
  };
}

export function connectedProgressFacts(input: {
  now: Date
  leads: {
    createdAt: Date
    offerId: string | null
    source?: string | null
    campaignId?: string | null
    campaign?: string | null
  }[]
  bookings: {
    id: string
    createdAt: Date
    offerId: string | null
    eventId: string | null
    status: string
  }[]
  payments: {
    createdAt: Date
    amountCents: number
    kind: string
    bookingId: string | null
  }[]
  events: {
    id: string
    offerId: string | null
    startsAt: Date | null
    capacity: number | null
    status: string
  }[]
}): ProgressFacts {
  const bookingOfferById = new Map(
    input.bookings.map((booking) => [booking.id, booking.offerId]),
  );
  return {
    now: input.now,
    leads: input.leads.map((lead) => ({
      createdAt: lead.createdAt,
      offerId: lead.offerId,
      source: lead.source ?? "",
      campaign: lead.campaignId ?? lead.campaign ?? "",
    })),
    bookings: input.bookings.map((booking) => ({
      createdAt: booking.createdAt,
      offerId: booking.offerId,
      eventId: booking.eventId,
      status: booking.status,
    })),
    payments: input.payments.map((payment) => ({
      createdAt: payment.createdAt,
      amountCents: payment.amountCents,
      kind: payment.kind,
      offerId: bookingOfferById.get(payment.bookingId ?? "") ?? null,
    })),
    events: input.events.map((event) => ({
      id: event.id,
      offerId: event.offerId,
      startsAt: event.startsAt,
      capacity: event.capacity,
      status: event.status,
    })),
  };
}
