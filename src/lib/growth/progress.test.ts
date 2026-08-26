import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  connectedProgressFacts,
  extraShareClause,
  goalShareAttribution,
  liveGoalProgress,
  planProgressSnapshot,
  progressDayKey,
  storedGoalFieldsFromLive,
} from "./progress";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  it("names the share that moved a lead Goal", () => {
    const goal = {
      goalType: "lead_generation",
      offerId: null,
      startsOn: new Date("2026-08-01T00:00:00.000Z"),
      currentValue: 0,
      targetValue: 10,
      unit: "leads",
    };
    const facts = {
      now,
      leads: [
        {
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
          offerId: null,
          source: "instagram",
          campaign: "spring-open-house",
        },
        {
          createdAt: new Date("2026-08-11T00:00:00.000Z"),
          offerId: null,
          source: "instagram",
          campaign: "spring-open-house",
        },
        {
          createdAt: new Date("2026-08-12T00:00:00.000Z"),
          offerId: null,
          source: "instagram",
          campaign: "fall-open-house",
        },
        {
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          offerId: null,
          source: "instagram",
          campaign: "too-old",
        },
      ],
      events: [],
      bookings: [],
      payments: [],
    };
    const share = goalShareAttribution(goal, facts);
    assert.equal(
      share?.note,
      "2 of 3 in this Goal number came from instagram · spring-open-house.",
    );
    assert.equal(share?.rows[0]?.origin, "instagram · spring-open-house");
    assert.equal(share?.rows[0]?.count, 2);
    assert.match(
      extraShareClause(share?.rows),
      /Other named shares: instagram · fall-open-house \(1\)/,
    );
    assert.equal(extraShareClause([{ origin: "instagram · spring-open-house", count: 3 }]), "");
    assert.equal(extraShareClause([]), "");
  });

  it("names the share next to a Goal that is updated by hand", () => {
    const goal = {
      goalType: "custom",
      offerId: null,
      startsOn: new Date("2026-08-01T00:00:00.000Z"),
      currentValue: 7,
      targetValue: 10,
      unit: "referrals",
    };
    const facts = {
      now,
      leads: [
        {
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
          offerId: null,
          source: "instagram",
          campaign: "spring-open-house",
        },
        {
          createdAt: new Date("2026-08-11T00:00:00.000Z"),
          offerId: null,
          source: "instagram",
          campaign: "spring-open-house",
        },
        {
          createdAt: new Date("2026-08-12T00:00:00.000Z"),
          offerId: null,
          source: "instagram",
          campaign: "fall-open-house",
        },
      ],
      events: [],
      bookings: [],
      payments: [],
    };
    const live = liveGoalProgress(goal, facts);
    const share = goalShareAttribution(goal, facts);
    assert.equal(live.computable, false);
    assert.equal(live.currentValue, 7);
    assert.equal(
      share?.note,
      "This Goal number is updated by hand. 2 of 3 people in this window came from instagram · spring-open-house.",
    );
    assert.equal(share?.rows[0]?.origin, "instagram · spring-open-house");
    assert.equal(share?.rows[0]?.count, 2);
    assert.match(
      extraShareClause(share?.rows),
      /Other named shares: instagram · fall-open-house \(1\)/,
    );
    assert.equal(
      goalShareAttribution({ ...goal, goalType: "visibility" }, facts)?.note,
      share?.note,
    );
    assert.equal(
      goalShareAttribution(goal, {
        ...facts,
        leads: [
          {
            createdAt: new Date("2026-08-10T00:00:00.000Z"),
            offerId: null,
            source: "instagram",
            campaign: "spring-open-house",
          },
        ],
      })?.note,
      "This Goal number is updated by hand. Named people in this window came from instagram · spring-open-house.",
    );
    assert.equal(
      goalShareAttribution(goal, {
        ...facts,
        leads: [
          {
            createdAt: new Date("2026-08-10T00:00:00.000Z"),
            offerId: null,
            source: "instagram",
            campaign: "",
          },
        ],
      })?.note,
      "This Goal number is updated by hand and does not yet name a share.",
    );
    assert.equal(
      goalShareAttribution(goal, { ...facts, leads: [] }),
      null,
    );
    const paidFacts = {
      ...facts,
      leads: [] as typeof facts.leads,
      payments: [
        {
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
          amountCents: 12000,
          kind: "charge",
          offerId: null,
          source: "instagram",
          campaign: "spring-open-house",
        },
        {
          createdAt: new Date("2026-08-10T12:00:00.000Z"),
          amountCents: 4000,
          kind: "charge",
          offerId: null,
          source: "instagram",
          campaign: "spring-open-house",
        },
        {
          createdAt: new Date("2026-08-11T00:00:00.000Z"),
          amountCents: 8000,
          kind: "charge",
          offerId: null,
          source: "instagram",
          campaign: "fall-open-house",
        },
      ],
    };
    const paid = goalShareAttribution(goal, paidFacts);
    assert.equal(liveGoalProgress(goal, paidFacts).currentValue, 7);
    assert.equal(liveGoalProgress(goal, paidFacts).computable, false);
    assert.equal(
      paid?.note,
      "This Goal number is updated by hand. 2 of 3 payments in this window came from instagram · spring-open-house.",
    );
    assert.match(
      extraShareClause(paid?.rows),
      /Other named shares: instagram · fall-open-house \(1\)/,
    );
    assert.equal(
      goalShareAttribution(
        { ...goal, goalType: "retention" },
        {
          ...facts,
          leads: [],
          bookings: [
            {
              createdAt: new Date("2026-08-10T00:00:00.000Z"),
              offerId: null,
              eventId: "e1",
              status: "confirmed",
              source: "instagram",
              campaign: "spring-open-house",
            },
          ],
        },
      )?.note,
      "This Goal number is updated by hand. Named bookings in this window came from instagram · spring-open-house.",
    );
    const mixed = goalShareAttribution(goal, {
      now,
      leads: [
        {
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
          offerId: null,
          source: "instagram",
          campaign: "spring-open-house",
        },
      ],
      events: [],
      bookings: [
        {
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
          offerId: null,
          eventId: "e1",
          status: "confirmed",
          source: "instagram",
          campaign: "spring-open-house",
        },
      ],
      payments: [
        {
          createdAt: new Date("2026-08-11T00:00:00.000Z"),
          amountCents: 5000,
          kind: "charge",
          offerId: null,
          source: "instagram",
          campaign: "spring-open-house",
        },
      ],
    });
    assert.equal(
      mixed?.note,
      "This Goal number is updated by hand. Named people, bookings, and payments in this window came from instagram · spring-open-house.",
    );
    const source = readFileSync(join(process.cwd(), "src/lib/growth/progress.ts"), "utf8");
    assert.match(source, /handUpdatedShareSummary/);
    assert.match(source, /updated by hand/);
    assert.match(source, /handUpdatedKindPhrase/);
  });

  it("names the share that moved a revenue Goal from matched payments", () => {
    const share = goalShareAttribution(
      {
        goalType: "revenue",
        offerId: null,
        startsOn: new Date("2026-08-01T00:00:00.000Z"),
        currentValue: 0,
        targetValue: 1000,
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
            amountCents: 30000,
            kind: "charge",
            offerId: null,
            source: "instagram",
            campaign: "spring-open-house",
          },
          {
            createdAt: new Date("2026-08-12T00:00:00.000Z"),
            amountCents: 17500,
            kind: "charge",
            offerId: null,
            source: "instagram",
            campaign: "fall-open-house",
          },
          {
            createdAt: new Date("2026-08-12T00:00:00.000Z"),
            amountCents: 20000,
            kind: "refund",
            offerId: null,
            source: "instagram",
            campaign: "spring-open-house",
          },
        ],
      },
    );
    assert.equal(
      share?.note,
      "300 of 475 dollars in this Goal number came from instagram · spring-open-house.",
    );
    assert.equal(share?.rows[0]?.count, 300);
  });

  it("names the share that moved a booking Goal, including through the first named lead", () => {
    const facts = connectedProgressFacts({
      now,
      leads: [
        {
          createdAt: new Date("2026-08-02T00:00:00.000Z"),
          offerId: null,
          contactId: "c1",
          source: "instagram",
          campaignId: "spring-open-house",
        },
      ],
      bookings: [
        {
          id: "b1",
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
          offerId: null,
          eventId: "e1",
          status: "confirmed",
          contactId: "c1",
        },
        {
          id: "b2",
          createdAt: new Date("2026-08-11T00:00:00.000Z"),
          offerId: null,
          eventId: "e1",
          status: "confirmed",
          contactId: "c2",
        },
      ],
      payments: [
        {
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
          amountCents: 12000,
          kind: "charge",
          bookingId: "b1",
          contactId: "c1",
        },
      ],
      events: [],
    });
    const bookings = goalShareAttribution(
      {
        goalType: "conversions",
        offerId: null,
        startsOn: new Date("2026-08-01T00:00:00.000Z"),
        currentValue: 0,
        targetValue: 10,
        unit: "bookings",
      },
      facts,
    );
    assert.equal(
      bookings?.note,
      "1 of 2 in this Goal number came from instagram · spring-open-house.",
    );
    const revenue = goalShareAttribution(
      {
        goalType: "revenue",
        offerId: null,
        startsOn: new Date("2026-08-01T00:00:00.000Z"),
        currentValue: 0,
        targetValue: 500,
        unit: "dollars",
      },
      facts,
    );
    assert.equal(revenue?.note, "This Goal number is from instagram · spring-open-house.");
  });

  it("counts a Traffic Goal from website visits and names the share", () => {
    const goal = {
      goalType: "traffic",
      offerId: null,
      startsOn: new Date("2026-08-01T00:00:00.000Z"),
      currentValue: 0,
      targetValue: 20,
      unit: "visits",
    };
    const facts = {
      now,
      leads: [],
      events: [],
      bookings: [
        {
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
          offerId: null,
          eventId: "e1",
          status: "confirmed",
          source: "instagram",
          campaign: "spring-open-house",
        },
      ],
      payments: [],
      visits: [
        {
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
          source: "instagram",
          campaign: "spring-open-house",
        },
        {
          createdAt: new Date("2026-08-11T00:00:00.000Z"),
          source: "instagram",
          campaign: "spring-open-house",
        },
        {
          createdAt: new Date("2026-08-12T00:00:00.000Z"),
          source: "instagram",
          campaign: "fall-open-house",
        },
        {
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          source: "instagram",
          campaign: "too-old",
        },
      ],
    };
    const live = liveGoalProgress(goal, facts);
    const share = goalShareAttribution(goal, facts);
    assert.equal(live.computable, true);
    assert.equal(live.currentValue, 3);
    assert.match(live.note, /3 website visits/);
    assert.equal(
      share?.note,
      "2 of 3 in this Goal number came from instagram · spring-open-house.",
    );
    assert.match(
      extraShareClause(share?.rows),
      /Other named shares: instagram · fall-open-house \(1\)/,
    );
    assert.equal(
      liveGoalProgress(goal, { ...facts, visits: [] }).currentValue,
      0,
    );
    const source = readFileSync(join(process.cwd(), "src/lib/growth/progress.ts"), "utf8");
    assert.match(source, /matchingVisits/);
    assert.match(source, /website visit/);
    const queries = readFileSync(join(process.cwd(), "src/lib/growth/queries.ts"), "utf8");
    assert.match(queries, /visits: visitRows/);
    const persist = readFileSync(join(process.cwd(), "src/lib/actions/growth.ts"), "utf8");
    assert.match(persist, /visits: visitRows/);
  });

  it("says when a lead Goal number does not name a share", () => {
    const share = goalShareAttribution(
      {
        goalType: "lead_generation",
        offerId: null,
        startsOn: null,
        currentValue: 0,
        targetValue: 5,
        unit: "leads",
      },
      {
        now,
        leads: [
          {
            createdAt: now,
            offerId: null,
            source: "manual",
            campaign: "",
          },
        ],
        events: [],
        bookings: [],
        payments: [],
      },
    );
    assert.equal(share?.note, "This Goal number does not yet name a share.");
    assert.deepEqual(share?.rows, []);
  });

  it("does not treat a place without a share name as a named share", () => {
    const share = goalShareAttribution(
      {
        goalType: "lead_generation",
        offerId: null,
        startsOn: null,
        currentValue: 0,
        targetValue: 5,
        unit: "leads",
      },
      {
        now,
        leads: [
          {
            createdAt: now,
            offerId: null,
            source: "instagram",
            campaign: "",
          },
        ],
        events: [],
        bookings: [],
        payments: [],
      },
    );
    assert.equal(share?.note, "This Goal number does not yet name a share.");
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
    assert.equal(
      goalShareAttribution(
        {
          goalType: "custom",
          offerId: null,
          startsOn: null,
          currentValue: 3,
          targetValue: 10,
          unit: "referrals",
        },
        { now, leads: [], events: [], bookings: [], payments: [] },
      ),
      null,
    );
  });

  it("stores one connected number per day and updates that day if it changed", () => {
    assert.equal(progressDayKey(now), "2026-08-23");
    assert.equal(
      planProgressSnapshot({
        existingSameDay: false,
        existingValue: null,
        nextValue: 4,
      }),
      "insert",
    );
    assert.equal(
      planProgressSnapshot({
        existingSameDay: true,
        existingValue: 4,
        nextValue: 4,
      }),
      "skip",
    );
    assert.equal(
      planProgressSnapshot({
        existingSameDay: true,
        existingValue: 4,
        nextValue: 6,
      }),
      "update",
    );
  });

  it("marks an active goal achieved when the saved number meets the target", () => {
    const stored = storedGoalFieldsFromLive(
      { status: "active", completedAt: null, targetValue: 5 },
      5,
      now,
    );
    assert.equal(stored.currentValue, 5);
    assert.equal(stored.status, "achieved");
    assert.equal(stored.completedAt?.toISOString(), now.toISOString());
  });

  it("does not reopen or market from a paused goal when the number is saved", () => {
    const stored = storedGoalFieldsFromLive(
      { status: "paused", completedAt: null, targetValue: 2 },
      4,
      now,
    );
    assert.equal(stored.status, "paused");
    assert.equal(stored.completedAt, null);
  });

  it("does not bake sailing or seat language into progress helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/progress.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
