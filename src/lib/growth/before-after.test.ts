import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  BEFORE_AFTER_SOURCE_STORED_GOAL,
  beforeAfterStatusTitle,
  describeBeforeAfter,
  describeBeforeAfterHeading,
  earliestAndLatestSnapshots,
  looksToShow,
  planBeforeAfterLooks,
  type BeforeAfterGoal,
  type BeforeAfterSnapshot,
} from "./before-after";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const GOAL_A = "33333333-3333-3333-3333-333333333333";
const SNAP_OLD = "44444444-4444-4444-4444-444444444444";
const SNAP_NEW = "55555555-5555-5555-5555-555555555555";

function goal(overrides: Partial<BeforeAfterGoal> = {}): BeforeAfterGoal {
  return {
    id: GOAL_A,
    organizationId: ORG_A,
    title: "  More people this month  ",
    unit: " people ",
    ...overrides,
  };
}

function snapshot(
  overrides: Partial<BeforeAfterSnapshot> = {},
): BeforeAfterSnapshot {
  return {
    id: SNAP_NEW,
    organizationId: ORG_A,
    goalId: GOAL_A,
    value: 8,
    recordedOn: "2026-09-11",
    recordedAt: new Date("2026-09-11T12:00:00.000Z"),
    ...overrides,
  };
}

describe("stored before-and-after looks", () => {
  it("compares the first and latest stored Goal numbers", () => {
    const plan = planBeforeAfterLooks({
      organizationId: ORG_A,
      goals: [goal()],
      snapshots: [
        snapshot({
          id: SNAP_OLD,
          value: 3,
          recordedOn: "2026-09-01",
          recordedAt: new Date("2026-09-01T12:00:00.000Z"),
        }),
        snapshot(),
      ],
    });

    assert.equal(plan.toUpsert.length, 1);
    assert.equal(plan.toUpsert[0]?.status, "improved");
    assert.equal(plan.toUpsert[0]?.organizationId, ORG_A);
    assert.equal(plan.toUpsert[0]?.goalId, GOAL_A);
    assert.equal(plan.toUpsert[0]?.beforeValue, 3);
    assert.equal(plan.toUpsert[0]?.afterValue, 8);
    assert.equal(plan.toUpsert[0]?.beforeSnapshotId, SNAP_OLD);
    assert.equal(plan.toUpsert[0]?.afterSnapshotId, SNAP_NEW);
    assert.equal(plan.toUpsert[0]?.source, BEFORE_AFTER_SOURCE_STORED_GOAL);
    assert.equal(beforeAfterStatusTitle("improved"), "Moved up");
    assert.match(plan.toUpsert[0]?.why ?? "", /from 3 people to 8 people/);
    assert.match(plan.toUpsert[0]?.why ?? "", /not an experiment GroovGro ran/);
    assert.match(plan.toUpsert[0]?.why ?? "", /not a reason to buy ads/);
    assert.equal(
      describeBeforeAfter({
        title: "More people this month",
        beforeValue: 3,
        afterValue: 8,
        unit: "people",
      }),
      "“More people this month” moved from 3 people to 8 people.",
    );
  });

  it("marks a lower or unchanged number and uses the earliest snapshot", () => {
    const pair = earliestAndLatestSnapshots(
      [
        snapshot({
          id: SNAP_NEW,
          value: 8,
          recordedAt: new Date("2026-09-11T12:00:00.000Z"),
        }),
        snapshot({
          id: SNAP_OLD,
          value: 3,
          recordedOn: "2026-09-01",
          recordedAt: new Date("2026-09-01T12:00:00.000Z"),
        }),
      ],
      GOAL_A,
    );
    assert.equal(pair?.before.id, SNAP_OLD);
    assert.equal(pair?.after.id, SNAP_NEW);

    const declined = planBeforeAfterLooks({
      organizationId: ORG_A,
      goals: [goal()],
      snapshots: [
        snapshot({
          id: SNAP_OLD,
          value: 8,
          recordedOn: "2026-09-01",
          recordedAt: new Date("2026-09-01T12:00:00.000Z"),
        }),
        snapshot({ value: 5 }),
      ],
    });
    assert.equal(declined.toUpsert[0]?.status, "declined");
    assert.equal(beforeAfterStatusTitle("declined"), "Moved down");

    const same = planBeforeAfterLooks({
      organizationId: ORG_A,
      goals: [goal()],
      snapshots: [
        snapshot({
          id: SNAP_OLD,
          value: 5,
          recordedOn: "2026-09-01",
          recordedAt: new Date("2026-09-01T12:00:00.000Z"),
        }),
        snapshot({ value: 5 }),
      ],
    });
    assert.equal(same.toUpsert[0]?.status, "same");
    assert.equal(beforeAfterStatusTitle("same"), "No move yet");
  });

  it("ignores a middle snapshot and only uses the first and latest", () => {
    const plan = planBeforeAfterLooks({
      organizationId: ORG_A,
      goals: [goal()],
      snapshots: [
        snapshot({
          id: SNAP_OLD,
          value: 3,
          recordedOn: "2026-09-01",
          recordedAt: new Date("2026-09-01T12:00:00.000Z"),
        }),
        snapshot({
          id: "66666666-6666-6666-6666-666666666666",
          value: 99,
          recordedOn: "2026-09-05",
          recordedAt: new Date("2026-09-05T12:00:00.000Z"),
        }),
        snapshot({ value: 8 }),
      ],
    });
    assert.equal(plan.toUpsert[0]?.beforeValue, 3);
    assert.equal(plan.toUpsert[0]?.afterValue, 8);
    assert.equal(plan.toUpsert[0]?.beforeSnapshotId, SNAP_OLD);
    assert.equal(plan.toUpsert[0]?.afterSnapshotId, SNAP_NEW);
    assert.equal(plan.toUpsert[0]?.status, "improved");
  });

  it("does not invent a look without an organization or two snapshots", () => {
    const missingOrg = planBeforeAfterLooks({
      organizationId: "",
      goals: [goal()],
      snapshots: [snapshot({ id: SNAP_OLD }), snapshot()],
    });
    assert.equal(missingOrg.toUpsert.length, 0);
    assert.equal(missingOrg.skipped[0]?.reason, "tenant_mismatch");

    const oneShot = planBeforeAfterLooks({
      organizationId: ORG_A,
      goals: [goal()],
      snapshots: [snapshot()],
    });
    assert.equal(oneShot.toUpsert.length, 0);
    assert.equal(oneShot.skipped[0]?.reason, "snapshots_missing");

    const otherOrg = planBeforeAfterLooks({
      organizationId: ORG_A,
      goals: [goal({ organizationId: ORG_B })],
      snapshots: [snapshot({ id: SNAP_OLD }), snapshot()],
    });
    assert.equal(otherOrg.toUpsert.length, 0);
    assert.equal(otherOrg.skipped[0]?.reason, "tenant_mismatch");
    assert.equal(looksToShow([]).length, 0);
  });

  it("does not fetch, run an experiment, buy ads, or reorder Next step", () => {
    const helper = readFileSync(
      join(process.cwd(), "src/lib/growth/before-after.ts"),
      "utf8",
    );
    const persist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-before-after.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/before-after-panel.tsx"),
      "utf8",
    );
    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    for (const source of [helper, persist, panel]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(source, /google ads|split test|ab test|p-value/i);
    }
    assert.match(persist, /eq\(growthGoals\.organizationId, organizationId\)/);
    assert.match(
      persist,
      /eq\(goalProgressSnapshots\.organizationId, organizationId\)/,
    );
    assert.match(persist, /eq\(beforeAfterLooks\.organizationId, organizationId\)/);
    assert.match(panel, /not an experiment GroovGro ran/);
    assert.match(panel, /describeBeforeAfterHeading/);
    assert.equal(
      describeBeforeAfterHeading(0),
      "What a stored before and after shows",
    );
    assert.equal(
      describeBeforeAfterHeading(2),
      "What a stored before and after shows · 2",
    );
    assert.match(panel, /will not buy ads/);
    const intelligence = readFileSync(
      join(process.cwd(), "src/app/(app)/app/intelligence/page.tsx"),
      "utf8",
    );
    const nextStepPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(intelligence, /BeforeAfterPanel/);
    assert.match(nextStepPage, /BeforeAfterPanel/);
    assert.match(nextStepPage, /refreshBeforeAfterLooks/);
    const queries = readFileSync(
      join(process.cwd(), "src/lib/growth/queries.ts"),
      "utf8",
    );
    assert.match(queries, /persistBeforeAfterLooks/);
    assert.doesNotMatch(nextStep, /beforeAfter|before_after|What a stored before/);
    assert.match(
      nextStep,
      /drafts \?\? ownerWork \?\? checkChanged \?\? reviewSite \?\? activate \?\? draftPlan \?\? approvePlan \?\? proposeActions \?\? waitingApprove \?\? learning/,
    );
  });
});
