import { goalProgressPercent } from "@/lib/growth/types";

export type ProgressLead = {
  createdAt: Date
  offerId: string | null
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
