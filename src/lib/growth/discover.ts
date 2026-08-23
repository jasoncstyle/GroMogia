import { OFFER_TYPES } from "@/lib/growth/types";
import {
  websiteBrainNotes,
  websiteOfferCandidates,
  type WebsitePageExtract,
} from "@/lib/growth/website-discover";

type OfferType = (typeof OFFER_TYPES)[number];

export type DiscoverEvent = {
  id: string
  title: string
  description: string
  eventType: string
  location: string
  startsAt: Date | null
  endsAt: Date | null
  capacity: number | null
  priceCents: number
  registrationUrl: string
  status: string
};

export type DiscoverBooking = {
  eventId: string | null
  status: string
  createdAt: Date
};

export type DiscoverPayment = {
  amountCents: number
  kind: string
  createdAt: Date
};

export type DiscoverExistingOffer = {
  id: string
  name: string
  externalProvider: string
  externalId: string
  discoveryStatus: string
};

export type DiscoverExistingGoal = {
  title: string
  goalType: string
  source: string
  discoveryStatus: string
};

export type DiscoverExistingConstraint = {
  externalId: string
};

export type ProposedOffer = {
  name: string
  description: string
  offerType: OfferType
  availabilityModel: "schedule" | "capacity" | "unconstrained"
  priceCents: number | null
  location: string
  conversionUrl: string
  externalProvider: "groovgro_events" | "connected_website" | "groovgro_builder"
  externalId: string
  eventIds: string[]
  confidence: number
  inferredFrom: "events" | "website" | "builder"
};

export type ProposedConstraint = {
  eventId: string
  offerExternalId: string
  constraintType: "capacity" | "schedule"
  unit: string
  totalAvailability: number | null
  remainingAvailability: number | null
  startsOn: Date | null
  endsOn: Date | null
  notes: string
};

export type ProposedGoal = {
  title: string
  description: string
  goalType: "utilization" | "revenue" | "conversions" | "visibility" | "lead_generation"
  targetValue: number | null
  baselineValue: number | null
  currentValue: number
  unit: string
  successDefinition: string
  inferredFrom: "events" | "payments" | "bookings" | "website"
  confidence: number
};

export type DiscoveryResult = {
  offers: ProposedOffer[]
  constraints: ProposedConstraint[]
  goals: ProposedGoal[]
  brainSummary: string
  brainSource: string
  confidence: number
};

const EVENT_TYPE_TO_OFFER: Record<string, OfferType> = {
  class: "registration",
  workshop: "registration",
  seminar: "registration",
  training: "registration",
  tour: "registration",
  appointment: "appointment",
  meeting: "appointment",
  reservation: "reservation",
  membership: "membership",
  subscription: "subscription",
  donation: "donation",
  service: "service",
  product: "product",
};

export function normalizeOfferKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function inferOfferType(eventType: string): OfferType {
  const key = eventType.trim().toLowerCase();
  if ((OFFER_TYPES as readonly string[]).includes(key)) {
    return key as OfferType;
  }
  return EVENT_TYPE_TO_OFFER[key] ?? "service";
}

function isCancelled(status: string): boolean {
  return status === "cancelled";
}

function isConfirmedBooking(status: string): boolean {
  return status !== "cancelled" && status !== "refunded";
}

function startOfToday(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function alreadyHasOffer(
  existing: DiscoverExistingOffer[],
  name: string,
  externalId: string,
): boolean {
  const key = normalizeOfferKey(name);
  return existing.some((offer) => {
    if (offer.discoveryStatus === "rejected") return false;
    if (
      (offer.externalProvider === "groovgro_events" ||
        offer.externalProvider === "connected_website" ||
        offer.externalProvider === "groovgro_builder") &&
      offer.externalId === externalId
    ) {
      return true;
    }
    return normalizeOfferKey(offer.name) === key;
  });
}

function alreadyHasGoal(
  existing: DiscoverExistingGoal[],
  goalType: string,
): boolean {
  return existing.some(
    (goal) =>
      goal.goalType === goalType &&
      goal.source === "inferred" &&
      goal.discoveryStatus !== "rejected",
  );
}

export function discoverFromConnectedData(input: {
  events: DiscoverEvent[]
  bookings: DiscoverBooking[]
  payments: DiscoverPayment[]
  existingOffers: DiscoverExistingOffer[]
  existingGoals: DiscoverExistingGoal[]
  existingConstraints: DiscoverExistingConstraint[]
  websiteUrl?: string | null
  brandDescription?: string | null
  websitePages?: WebsitePageExtract[]
  now?: Date
}): DiscoveryResult {
  const now = input.now ?? new Date();
  const today = startOfToday(now);
  const windowStart = daysAgo(now, 30);

  const usableEvents = input.events.filter((event) => !isCancelled(event.status));
  const bookingsByEvent = new Map<string, number>();
  for (const booking of input.bookings) {
    if (!booking.eventId || !isConfirmedBooking(booking.status)) continue;
    bookingsByEvent.set(booking.eventId, (bookingsByEvent.get(booking.eventId) ?? 0) + 1);
  }

  const groups = new Map<string, DiscoverEvent[]>();
  for (const event of usableEvents) {
    const key = normalizeOfferKey(event.title);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  const offers: ProposedOffer[] = [];
  for (const [key, group] of groups) {
    const named = group[0];
    if (!named) continue;
    if (alreadyHasOffer(input.existingOffers, named.title, key)) continue;

    const booked = group.reduce(
      (sum, event) => sum + (bookingsByEvent.get(event.id) ?? 0),
      0,
    );
    const priced = group.find((event) => event.priceCents > 0);
    const dated = group.some((event) => event.startsAt);
    const capped = group.some((event) => event.capacity != null);
    const confidence = Math.min(
      95,
      55 + group.length * 10 + (booked > 0 ? 15 : 0) + (priced ? 5 : 0),
    );

    offers.push({
      name: named.title,
      description: named.description,
      offerType: inferOfferType(named.eventType),
      availabilityModel: dated ? "schedule" : capped ? "capacity" : "unconstrained",
      priceCents: priced?.priceCents ?? (named.priceCents > 0 ? named.priceCents : null),
      location: named.location,
      conversionUrl: named.registrationUrl,
      externalProvider: "groovgro_events",
      externalId: key,
      eventIds: group.map((event) => event.id),
      confidence,
      inferredFrom: "events",
    });
  }

  const websitePages = input.websitePages ?? [];
  for (const candidate of websiteOfferCandidates(websitePages)) {
    if (alreadyHasOffer(input.existingOffers, candidate.name, candidate.externalId)) {
      continue;
    }
    offers.push({
      name: candidate.name,
      description: candidate.description,
      offerType: "other",
      availabilityModel: "unconstrained",
      priceCents: null,
      location: "",
      conversionUrl: candidate.conversionUrl,
      externalProvider:
        candidate.source === "groovgro_builder" ? "groovgro_builder" : "connected_website",
      externalId: candidate.externalId,
      eventIds: [],
      confidence: candidate.confidence,
      inferredFrom: candidate.source === "groovgro_builder" ? "builder" : "website",
    });
  }

  const constraints: ProposedConstraint[] = [];
  for (const event of usableEvents) {
    if (!event.startsAt && event.capacity == null) continue;
    if (input.existingConstraints.some((row) => row.externalId === event.id)) continue;
    const offerKey = normalizeOfferKey(event.title);
    if (!offerKey) continue;
    const booked = bookingsByEvent.get(event.id) ?? 0;
    const remaining =
      event.capacity == null ? null : Math.max(0, event.capacity - booked);
    constraints.push({
      eventId: event.id,
      offerExternalId: offerKey,
      constraintType: event.capacity != null ? "capacity" : "schedule",
      unit: event.capacity != null ? "spots" : "",
      totalAvailability: event.capacity,
      remainingAvailability: remaining,
      startsOn: event.startsAt,
      endsOn: event.endsAt,
      notes: event.title,
    });
  }

  const upcoming = usableEvents.filter(
    (event) => !event.startsAt || event.startsAt.getTime() >= today.getTime(),
  );
  const remainingSpots = upcoming.reduce((sum, event) => {
    if (event.capacity == null) return sum;
    return sum + Math.max(0, event.capacity - (bookingsByEvent.get(event.id) ?? 0));
  }, 0);

  const recentCharges = input.payments.filter(
    (payment) =>
      payment.kind !== "refund" && payment.createdAt.getTime() >= windowStart.getTime(),
  );
  const recentRevenueCents = recentCharges.reduce(
    (sum, payment) => sum + Math.max(0, payment.amountCents),
    0,
  );
  const recentRevenueDollars = Math.round(recentRevenueCents / 100);
  const recentBookings = input.bookings.filter(
    (booking) =>
      isConfirmedBooking(booking.status) &&
      booking.createdAt.getTime() >= windowStart.getTime(),
  ).length;

  const goals: ProposedGoal[] = [];
  if (remainingSpots > 0 && !alreadyHasGoal(input.existingGoals, "utilization")) {
    goals.push({
      title: "Fill upcoming scheduled spots",
      description:
        "Suggested from remaining availability on upcoming scheduled items. Confirm only if this is the outcome you want.",
      goalType: "utilization",
      targetValue: remainingSpots,
      baselineValue: remainingSpots,
      currentValue: 0,
      unit: "spots",
      successDefinition: `Fill ${remainingSpots} remaining upcoming spots. Edit the number if this is not the right target.`,
      inferredFrom: "events",
      confidence: 70,
    });
  } else if (
    recentBookings > 0 &&
    remainingSpots === 0 &&
    !alreadyHasGoal(input.existingGoals, "conversions")
  ) {
    goals.push({
      title: "Keep converting at the current pace",
      description:
        "Suggested from recent bookings. Confirm and change the target if you want growth, not a match.",
      goalType: "conversions",
      targetValue: recentBookings,
      baselineValue: recentBookings,
      currentValue: recentBookings,
      unit: "bookings",
      successDefinition: `Record at least ${recentBookings} bookings in a 30-day window.`,
      inferredFrom: "bookings",
      confidence: 55,
    });
  }

  if (recentRevenueDollars > 0 && !alreadyHasGoal(input.existingGoals, "revenue")) {
    goals.push({
      title: "At least match the last 30 days of recorded revenue",
      description:
        "Suggested from connected payments. GroovGro is not inventing a growth percentage. Edit the target if you want a different number.",
      goalType: "revenue",
      targetValue: recentRevenueDollars,
      baselineValue: recentRevenueDollars,
      currentValue: recentRevenueDollars,
      unit: "dollars",
      successDefinition: `Recorded payments over the next 30 days reach ${recentRevenueDollars} dollars.`,
      inferredFrom: "payments",
      confidence: 65,
    });
  }

  if (
    websitePages.length > 0 &&
    !alreadyHasGoal(input.existingGoals, "visibility") &&
    !alreadyHasGoal(input.existingGoals, "traffic")
  ) {
    goals.push({
      title: "Get found from the connected website",
      description:
        "Suggested because GroovGro can see a connected website. Confirm only if being found is the outcome you want. GroovGro will not change the site.",
      goalType: "visibility",
      targetValue: null,
      baselineValue: null,
      currentValue: 0,
      unit: "",
      successDefinition:
        "People can find the connected website and understand what to do next. Edit or reject if this is not the Goal.",
      inferredFrom: "website",
      confidence: 50,
    });
  }

  const sources = [
    usableEvents.length ? "events" : null,
    input.bookings.length ? "bookings" : null,
    input.payments.length ? "payments" : null,
    input.websiteUrl || websitePages.length ? "website" : null,
  ].filter(Boolean);

  const parts = [
    `GroovGro looked at connected records, not an industry guess.`,
    usableEvents.length
      ? `It found ${usableEvents.length} scheduled item${usableEvents.length === 1 ? "" : "s"} that look like ${groups.size} possible offer${groups.size === 1 ? "" : "s"}.`
      : "It did not find scheduled items to turn into offers.",
    recentBookings
      ? `${recentBookings} booking${recentBookings === 1 ? "" : "s"} in the last 30 days.`
      : null,
    recentRevenueDollars
      ? `About ${recentRevenueDollars} dollars in recorded payments in the last 30 days.`
      : null,
    input.websiteUrl ? `A website is connected at ${input.websiteUrl}.` : null,
    ...websiteBrainNotes(websitePages),
    input.brandDescription
      ? "Brand already describes what the business does."
      : null,
    "Drafts stay inactive until you confirm them.",
  ].filter(Boolean);

  return {
    offers,
    constraints,
    goals,
    brainSummary: parts.join(" "),
    brainSource: sources.join(", ") || "none",
    confidence: offers.length || goals.length ? 70 : 40,
  };
}
