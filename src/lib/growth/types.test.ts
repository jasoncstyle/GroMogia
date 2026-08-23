import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONSTRAINT_TYPES,
  DEFAULT_EVIDENCE_POLICIES,
  evidenceRecommendation,
  goalProgressPercent,
  hasEnoughEvidence,
  isGoalAchieved,
  listFromCommaText,
} from "./types";

describe("growth foundation", () => {
  it("calculates goal progress without inventing a target", () => {
    assert.equal(goalProgressPercent(3, 10), 30);
    assert.equal(goalProgressPercent(0, 0), null);
    assert.equal(goalProgressPercent(5, null), null);
  });

  it("treats a reached target as achieved", () => {
    assert.equal(isGoalAchieved(7, 7), true);
    assert.equal(isGoalAchieved(6, 7), false);
  });

  it("recommends no change when evidence is thin", () => {
    const policy = DEFAULT_EVIDENCE_POLICIES[0];
    assert.equal(
      evidenceRecommendation(
        { elapsedDays: 2, observations: 4, conversions: 1 },
        policy,
      ),
      "no_change_yet",
    );
    assert.equal(
      hasEnoughEvidence(
        { elapsedDays: 30, observations: 80, conversions: 20 },
        policy,
      ),
      true,
    );
  });

  it("keeps constraint types industry-neutral", () => {
    assert.deepEqual(
      [...CONSTRAINT_TYPES],
      [
        "inventory",
        "capacity",
        "schedule",
        "resource",
        "workload",
        "time_window",
        "external",
        "unconstrained",
      ],
    );
  });

  it("does not bake sailing or seat language into the growth model", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/schema.ts"), "utf8");
    const growthSlice = schema.slice(schema.indexOf("export const businessBrains"));
    for (const banned of ["seat", "boat", "student", "ticket", "sailing"]) {
      assert.equal(growthSlice.toLowerCase().includes(banned), false, banned);
    }
  });

  it("splits comma lists without empty items", () => {
    assert.deepEqual(listFromCommaText("Austin,  , Dallas"), ["Austin", "Dallas"]);
  });

  it("gives SEO a longer default window than email", () => {
    const seo = DEFAULT_EVIDENCE_POLICIES.find((row) => row.channel === "seo");
    const email = DEFAULT_EVIDENCE_POLICIES.find((row) => row.channel === "email");
    assert.ok(seo && email);
    assert.ok(seo.minElapsedDays > email.minElapsedDays);
  });
});
