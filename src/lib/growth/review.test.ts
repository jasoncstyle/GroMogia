import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_EVIDENCE_POLICIES } from "./types";
import {
  connectedEvidenceSample,
  describeCountChange,
  generateGrowthReview,
  nextScheduledReview,
  reviewPeriod,
  scheduledReviewLabel,
  type ReviewInput,
} from "./review";

const now = new Date("2026-08-23T12:00:00.000Z");

function baseInput(overrides: Partial<ReviewInput> = {}): ReviewInput {
  return {
    now,
    kind: "weekly",
    goals: [],
    offers: [],
    decisions: [],
    policies: [...DEFAULT_EVIDENCE_POLICIES],
    settings: {
      reviewFrequency: "weekly",
      reviewDay: "monday",
      reviewTime: "10:00",
      timezone: "UTC",
    },
    leads: [],
    bookings: [],
    payments: [],
    ...overrides,
  };
}

describe("growth review", () => {
  it("uses a 7-day window for weekly and 30 days for monthly", () => {
    const weekly = reviewPeriod("weekly", now);
    const monthly = reviewPeriod("monthly", now);
    assert.equal(weekly.days, 7);
    assert.equal(monthly.days, 30);
    assert.match(weekly.periodLabel, /Week of/);
    assert.match(monthly.periodLabel, /August 2026/);
  });

  it("describes period-over-period counts without inventing activity", () => {
    assert.equal(
      describeCountChange(0, 0, "lead", "leads"),
      "No leads in this period or the one before.",
    );
    assert.equal(
      describeCountChange(3, 1, "lead", "leads"),
      "3 leads this period, up from 1 before.",
    );
    assert.equal(
      describeCountChange(1, 4, "booking", "bookings"),
      "1 booking this period, down from 4 before.",
    );
  });

  it("recommends leaving the plan alone when evidence is thin", () => {
    const review = generateGrowthReview(
      baseInput({
        leads: [{ createdAt: new Date("2026-08-20T00:00:00.000Z") }],
        goals: [
          {
            id: "g1",
            title: "Fill upcoming scheduled spots",
            status: "active",
            goalType: "utilization",
            liveCurrentValue: 1,
            targetValue: 8,
            progressPercent: 13,
            liveNote: "1 of 8 upcoming spots are filled.",
            discoveryStatus: "confirmed",
          },
        ],
      }),
    );

    assert.equal(review.primary.kind, "no_change_yet");
    assert.match(review.headline, /Leave this week alone/);
    assert.match(review.whatShouldHappenNext, /will not execute marketing/);
    assert.equal(
      review.recommendations.some((row) => row.kind === "no_change_yet"),
      true,
    );
    const ads = review.evidenceChecks.find((row) => row.channel === "advertising");
    assert.ok(ads);
    assert.equal(ads.verdict, "no_change_yet");
    assert.match(ads.reason, /Leave that channel alone/);
  });

  it("asks the owner to confirm drafts and still leaves marketing alone", () => {
    const review = generateGrowthReview(
      baseInput({
        offers: [{ name: "Weekend workshop", discoveryStatus: "inferred" }],
        goals: [
          {
            id: "g2",
            title: "Match last month's revenue",
            status: "draft",
            goalType: "revenue",
            liveCurrentValue: 0,
            targetValue: 400,
            progressPercent: 0,
            liveNote: "Suggested",
            discoveryStatus: "inferred",
          },
        ],
      }),
    );

    assert.equal(review.primary.classification, "operational");
    assert.match(review.primary.recommendation, /Open Next step to confirm or reject/);
    assert.match(review.whatNeedsAttention, /Open Next step to confirm or reject/);
    assert.match(review.headline, /Do not change marketing yet/);
    assert.equal(
      review.recommendations.some((row) => row.kind === "no_change_yet"),
      true,
    );
    assert.doesNotMatch(review.whatShouldHappenNext, /run ads|send email|publish/i);
  });

  it("treats a reached monthly goal as a strategy question, not an ads change", () => {
    const review = generateGrowthReview(
      baseInput({
        kind: "monthly",
        leads: Array.from({ length: 25 }, (_, index) => ({
          createdAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
        })),
        bookings: Array.from({ length: 10 }, (_, index) => ({
          createdAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
        })),
        payments: Array.from({ length: 10 }, (_, index) => ({
          createdAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
          amountCents: 5000,
          kind: "charge",
        })),
        goals: [
          {
            id: "g3",
            title: "Match last 30 days of revenue",
            status: "active",
            goalType: "revenue",
            liveCurrentValue: 500,
            targetValue: 400,
            progressPercent: 125,
            liveNote: "500 dollars in connected payments.",
            discoveryStatus: "confirmed",
          },
        ],
      }),
    );

    assert.equal(review.primary.classification, "strategic");
    assert.match(review.primary.recommendation, /looks reached/);
    assert.match(review.primary.recommendation, /Open Next step/);
    assert.match(review.primary.recommendation, /Do not start ads/);
    assert.match(review.strategyNote, /Active Goals/);
  });

  it("notices a far-behind goal only after the default evidence window is met", () => {
    const thin = generateGrowthReview(
      baseInput({
        goals: [
          {
            id: "g4",
            title: "Fill upcoming scheduled spots",
            status: "active",
            goalType: "utilization",
            liveCurrentValue: 0,
            targetValue: 12,
            progressPercent: 0,
            liveNote: "0 of 12 upcoming spots are filled.",
            discoveryStatus: "confirmed",
          },
        ],
      }),
    );
    assert.equal(thin.primary.kind, "no_change_yet");

    const enough = generateGrowthReview(
      baseInput({
        leads: Array.from({ length: 20 }, (_, index) => ({
          createdAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
        })),
        bookings: Array.from({ length: 8 }, (_, index) => ({
          createdAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
        })),
        payments: Array.from({ length: 6 }, (_, index) => ({
          createdAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
          amountCents: 1000,
          kind: "charge",
        })),
        goals: [
          {
            id: "g4",
            title: "Fill upcoming scheduled spots",
            status: "active",
            goalType: "utilization",
            liveCurrentValue: 0,
            targetValue: 12,
            progressPercent: 0,
            liveNote: "0 of 12 upcoming spots are filled.",
            discoveryStatus: "confirmed",
          },
        ],
      }),
    );
    assert.equal(enough.primary.classification, "optimization");
    assert.match(enough.primary.recommendation, /Open Next step/);
    assert.match(enough.primary.recommendation, /will not change ads, email, or the website/);
    assert.match(enough.whatNeedsAttention, /Open Next step to review the schedule/);
  });

  it("counts connected evidence without treating refunds as conversions", () => {
    const sample = connectedEvidenceSample({
      now,
      leads: [{ createdAt: new Date("2026-08-01T00:00:00.000Z") }],
      bookings: [{ createdAt: new Date("2026-08-10T00:00:00.000Z") }],
      payments: [
        { createdAt: new Date("2026-08-10T00:00:00.000Z"), amountCents: 2000, kind: "charge" },
        { createdAt: new Date("2026-08-11T00:00:00.000Z"), amountCents: 2000, kind: "refund" },
      ],
    });
    assert.equal(sample.observations, 2);
    assert.equal(sample.conversions, 2);
    assert.ok(sample.elapsedDays >= 21);
  });

  it("asks Growth review to name Next step when there is no Goal yet", () => {
    const weekly = generateGrowthReview(baseInput({ goals: [], offers: [] }));
    assert.match(weekly.primary.recommendation, /Open Next step to add a measurable Goal/);
    assert.match(weekly.whatNeedsAttention, /Open Next step to add one/);
    assert.match(weekly.howWeAreDoing, /Open Next step to add one/);
    const monthly = generateGrowthReview(
      baseInput({ kind: "monthly", goals: [], offers: [] }),
    );
    assert.match(monthly.strategyNote, /Open Next step to confirm or add a Goal first/);
  });

  it("asks the owner to set a review day on Next step", () => {
    assert.match(scheduledReviewLabel(null, now), /on Next step/);
    assert.doesNotMatch(scheduledReviewLabel(null, now), /on Goals/);
  });

  it("finds the next scheduled look after now", () => {
    const next = nextScheduledReview(
      {
        reviewFrequency: "weekly",
        reviewDay: "monday",
        reviewTime: "10:00",
        timezone: "UTC",
      },
      now,
    );
    assert.ok(next);
    assert.equal(next.getUTCDay(), 1);
    assert.ok(next.getTime() > now.getTime());
  });

  it("does not bake sailing or seat language into review copy", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/review.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
