import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONSTRAINT_TYPES,
  DEFAULT_EVIDENCE_POLICIES,
  draftToggleTitle,
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

  it("names the draft toggle with a count", () => {
    assert.equal(draftToggleTitle("offer", 1), "1 possible offer");
    assert.equal(draftToggleTitle("offer", 6), "6 possible offers");
    assert.equal(draftToggleTitle("goal", 1), "1 suggested goal");
    assert.equal(draftToggleTitle("goal", 2), "2 suggested goals");
  });

  it("lets the owner read a draft before confirm or reject", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/growth-review.tsx"),
      "utf8",
    );
    assert.match(source, /Open to read this draft/);
    assert.match(source, /Confirm or reject it on Next step/);
    assert.match(source, /offer.description/);
    assert.match(source, /Page GroovGro read/);
    assert.match(source, /goal.successDefinition/);
  });

  it("gives SEO a longer default window than email", () => {
    const seo = DEFAULT_EVIDENCE_POLICIES.find((row) => row.channel === "seo");
    const email = DEFAULT_EVIDENCE_POLICIES.find((row) => row.channel === "email");
    assert.ok(seo && email);
    assert.ok(seo.minElapsedDays > email.minElapsedDays);
  });
});
