import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { liveGoalProgress } from "./progress";

const now = new Date("2026-08-23T12:00:00.000Z");

describe("live goal progress", () => {
  it("counts filled upcoming spots from bookings, not from a stored guess", () => {
    const live = liveGoalProgress(
      {
        goalType: "utilization",
        offerId: "offer-1",
        startsOn: null,
        currentValue: 0,
        targetValue: 8,
        unit: "spots",
      },
      {
        now,
        leads: [],
        events: [
          {
            id: "e1",
            offerId: "offer-1",
            startsAt: new Date("2026-08-28T15:00:00.000Z"),
            capacity: 8,
            status: "scheduled",
          },
        ],
        bookings: [
          {
            createdAt: now,
            offerId: "offer-1",
            eventId: "e1",
            status: "confirmed",
          },
          {
            createdAt: now,
            offerId: "offer-1",
            eventId: "e1",
            status: "refunded",
          },
        ],
        payments: [],
      },
    );

    assert.equal(live.computable, true);
    assert.equal(live.currentValue, 1);
    assert.equal(live.progressPercent, 13);
    assert.match(live.note, /1 of 8/);
  });

  it("scopes revenue to one offer and ignores refunds", () => {
    const live = liveGoalProgress(
      {
        goalType: "revenue",
        offerId: "offer-1",
        startsOn: new Date("2026-08-01T00:00:00.000Z"),
        currentValue: 0,
        targetValue: 500,
        unit: "dollars",
      },
      {
        now,
        leads: [],
        events: [],
        bookings: [],
        payments: [
          {
            createdAt: new Date("2026-08-10T00:00:00.000Z"),
            amountCents: 47500,
            kind: "charge",
            offerId: "offer-1",
          },
          {
            createdAt: new Date("2026-08-12T00:00:00.000Z"),
            amountCents: 20000,
            kind: "refund",
            offerId: "offer-1",
          },
          {
            createdAt: new Date("2026-08-12T00:00:00.000Z"),
            amountCents: 99900,
            kind: "charge",
            offerId: "offer-2",
          },
        ],
      },
    );

    assert.equal(live.currentValue, 475);
    assert.doesNotMatch(live.note.toLowerCase(), /sailing|boat|seat/);
  });

  it("leaves custom goals as manual numbers", () => {
    const live = liveGoalProgress(
      {
        goalType: "custom",
        offerId: null,
        startsOn: null,
        currentValue: 3,
        targetValue: 10,
        unit: "referrals",
      },
      { now, leads: [], events: [], bookings: [], payments: [] },
    );
    assert.equal(live.computable, false);
    assert.equal(live.currentValue, 3);
    assert.equal(live.progressPercent, 30);
  });
});
