import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  discoverFromConnectedData,
  inferOfferType,
  normalizeOfferKey,
} from "./discover";

const now = new Date("2026-08-23T12:00:00.000Z");

describe("growth discovery", () => {
  it("groups scheduled items with the same name into one offer", () => {
    const result = discoverFromConnectedData({
      now,
      events: [
        {
          id: "e1",
          title: "Intro Workshop",
          description: "Beginner session",
          eventType: "workshop",
          location: "Harbor",
          startsAt: new Date("2026-08-28T15:00:00.000Z"),
          endsAt: null,
          capacity: 8,
          priceCents: 15000,
          registrationUrl: "https://example.com/workshop",
          status: "scheduled",
        },
        {
          id: "e2",
          title: "intro workshop",
          description: "",
          eventType: "workshop",
          location: "Harbor",
          startsAt: new Date("2026-09-12T15:00:00.000Z"),
          endsAt: null,
          capacity: 8,
          priceCents: 15000,
          registrationUrl: "",
          status: "scheduled",
        },
      ],
      bookings: [{ eventId: "e1", status: "confirmed", createdAt: now }],
      payments: [],
      existingOffers: [],
      existingGoals: [],
      existingConstraints: [],
    });

    assert.equal(result.offers.length, 1);
    assert.equal(result.offers[0]?.name, "Intro Workshop");
    assert.equal(result.offers[0]?.offerType, "registration");
    assert.equal(result.offers[0]?.availabilityModel, "schedule");
    assert.equal(result.offers[0]?.eventIds.length, 2);
    assert.equal(result.constraints.length, 2);
    assert.equal(result.constraints[0]?.remainingAvailability, 7);
  });

  it("does not activate goals and skips duplicates", () => {
    const result = discoverFromConnectedData({
      now,
      events: [
        {
          id: "e1",
          title: "Office hours",
          description: "",
          eventType: "appointment",
          location: "",
          startsAt: new Date("2026-09-01T17:00:00.000Z"),
          endsAt: null,
          capacity: 4,
          priceCents: 0,
          registrationUrl: "",
          status: "scheduled",
        },
      ],
      bookings: [],
      payments: [
        {
          amountCents: 47500,
          kind: "charge",
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
        },
      ],
      existingOffers: [
        {
          id: "o1",
          name: "Office hours",
          externalProvider: "groovgro_events",
          externalId: "office hours",
          discoveryStatus: "inferred",
        },
      ],
      existingGoals: [
        {
          title: "Fill upcoming scheduled spots",
          goalType: "utilization",
          source: "inferred",
          discoveryStatus: "inferred",
        },
      ],
      existingConstraints: [{ externalId: "e1" }],
    });

    assert.equal(result.offers.length, 0);
    assert.equal(result.constraints.length, 0);
    assert.equal(result.goals.some((goal) => goal.goalType === "utilization"), false);
    assert.equal(result.goals.some((goal) => goal.goalType === "revenue"), true);
    assert.equal(result.goals[0]?.targetValue, 475);
  });

  it("skips cancelled items and does not guess an industry", () => {
    const result = discoverFromConnectedData({
      now,
      events: [
        {
          id: "e1",
          title: "Cancelled session",
          description: "",
          eventType: "class",
          location: "",
          startsAt: new Date("2026-09-01T17:00:00.000Z"),
          endsAt: null,
          capacity: 10,
          priceCents: 0,
          registrationUrl: "",
          status: "cancelled",
        },
      ],
      bookings: [],
      payments: [],
      existingOffers: [],
      existingGoals: [],
      existingConstraints: [],
      websiteUrl: "https://www.example.com",
      brandDescription: "We teach people a skill.",
    });

    assert.equal(result.offers.length, 0);
    assert.equal(result.goals.length, 0);
    assert.match(result.brainSummary, /not an industry guess/);
    assert.doesNotMatch(result.brainSummary.toLowerCase(), /sailing|boat|seat/);
  });

  it("drafts website offers and a visibility Goal without changing the site", () => {
    const result = discoverFromConnectedData({
      now,
      events: [],
      bookings: [],
      payments: [],
      existingOffers: [],
      existingGoals: [],
      existingConstraints: [],
      websiteUrl: "https://www.example.com",
      websitePages: [
        {
          url: "https://www.example.com/workshops",
          title: "Weekend Workshop",
          description: "A half-day session.",
          headings: ["Weekend Workshop"],
          navLabels: [],
          source: "connected_website",
          isHome: false,
        },
      ],
    });

    assert.equal(result.offers.length, 1);
    assert.equal(result.offers[0]?.name, "Weekend Workshop");
    assert.equal(result.offers[0]?.inferredFrom, "website");
    assert.equal(result.offers[0]?.eventIds.length, 0);
    assert.equal(result.goals.some((goal) => goal.goalType === "visibility"), true);
    assert.match(result.brainSummary, /did not change/);
    assert.doesNotMatch(result.brainSummary.toLowerCase(), /sailing|boat|seat/);
  });

  it("maps generic event types without industry words", () => {
    assert.equal(inferOfferType("workshop"), "registration");
    assert.equal(inferOfferType("appointment"), "appointment");
    assert.equal(inferOfferType("service"), "service");
    assert.equal(normalizeOfferKey("Intro  Workshop"), "intro workshop");
  });
});
