import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  daysBetween,
  encodeWorkBaseline,
  learnFromOwnerWork,
  learningKindFromOutcome,
  parseWorkBaseline,
} from "./work-learning";

describe("owner work learning", () => {
  it("encodes and reads a Goal baseline", () => {
    const encoded = encodeWorkBaseline({
      value: 2,
      targetValue: 10,
      unit: "leads",
    });
    assert.equal(parseWorkBaseline(`The owner did this.\n${encoded}`)?.value, 2);
    assert.equal(parseWorkBaseline(encoded)?.targetValue, 10);
    assert.equal(parseWorkBaseline(encoded)?.unit, "leads");
    assert.equal(parseWorkBaseline("no baseline here"), null);
  });

  it("says wait when the work was just marked done", () => {
    const learning = learnFromOwnerWork({
      goalTitle: "More people get in touch",
      hasGoal: true,
      baselineValue: 2,
      currentValue: 3,
      targetValue: 10,
      unit: "leads",
      daysSinceDone: 1,
    });
    assert.equal(learning.kind, "too_soon");
    assert.equal(learning.changeCourse, false);
    assert.match(learning.outcome, /Wait before changing course/);
    assert.match(learning.outcome, /Do not change the plan/);
  });

  it("reports improvement without starting marketing", () => {
    const learning = learnFromOwnerWork({
      goalTitle: "More people get in touch",
      hasGoal: true,
      baselineValue: 2,
      currentValue: 5,
      targetValue: 10,
      unit: "leads",
      daysSinceDone: 8,
    });
    assert.equal(learning.kind, "improved");
    assert.match(learning.outcome, /2 leads to 5 leads/);
    assert.doesNotMatch(learning.outcome, /buy ads|launch a campaign/i);
  });

  it("says the Goal was reached without executing", () => {
    const learning = learnFromOwnerWork({
      goalTitle: "More people get in touch",
      hasGoal: true,
      baselineValue: 8,
      currentValue: 10,
      targetValue: 10,
      unit: "leads",
      daysSinceDone: 3,
    });
    assert.equal(learning.kind, "target_reached");
    assert.match(learning.outcome, /reached its target/);
    assert.match(learning.outcome, /Read the history on Next step/);
    assert.match(learning.outcome, /will not start a new campaign/);
    assert.doesNotMatch(learning.outcome, /Open Goals/);
  });

  it("asks for a baseline when none was stored", () => {
    const learning = learnFromOwnerWork({
      goalTitle: "Be easier to find",
      hasGoal: true,
      baselineValue: null,
      currentValue: 4,
      targetValue: null,
      unit: "",
      daysSinceDone: 9,
    });
    assert.equal(learning.kind, "need_baseline");
    assert.match(learning.outcome, /starting point/);
  });

  it("counts whole days between two times", () => {
    const from = new Date("2026-08-01T10:00:00.000Z");
    const to = new Date("2026-08-08T09:00:00.000Z");
    assert.equal(daysBetween(from, to), 6);
    assert.equal(daysBetween(to, from), 0);
  });

  it("reads the learning kind back from the written outcome", () => {
    const tooSoon = learnFromOwnerWork({
      goalTitle: "More people get in touch",
      hasGoal: true,
      baselineValue: 2,
      currentValue: 3,
      targetValue: 10,
      unit: "leads",
      daysSinceDone: 1,
    });
    assert.equal(learningKindFromOutcome(tooSoon.outcome), "too_soon");
    assert.equal(learningKindFromOutcome(""), null);
  });

  it("names the share that moved the Goal number after work", () => {
    const learning = learnFromOwnerWork({
      goalTitle: "More people get in touch",
      hasGoal: true,
      baselineValue: 2,
      currentValue: 5,
      targetValue: 10,
      unit: "leads",
      daysSinceDone: 8,
      shareNote: "This Goal number is from instagram · spring-open-house.",
    });
    assert.equal(learning.kind, "improved");
    assert.match(learning.outcome, /instagram · spring-open-house/);
    assert.match(learning.outcome, /2 leads to 5 leads/);
  });

  it("keeps the same kind when a share name is present", () => {
    const tooSoon = learnFromOwnerWork({
      goalTitle: "More people get in touch",
      hasGoal: true,
      baselineValue: 2,
      currentValue: 3,
      targetValue: 10,
      unit: "leads",
      daysSinceDone: 1,
      shareNote: "This Goal number is from instagram · spring-open-house.",
    });
    assert.equal(learningKindFromOutcome(tooSoon.outcome), "too_soon");
    assert.match(tooSoon.outcome, /instagram · spring-open-house/);
  });

  it("passes the Goal share into Check what changed", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/actions/owner-work.ts"),
      "utf8",
    );
    assert.match(source, /shareNote: goal\?\.shareNote/);
  });

  it("does not bake industry-specific words into learning helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/work-learning.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });

  it("names Next step when a Goal is reached or a next Goal is already drafted", () => {
    const nextGoal = readFileSync(
      join(process.cwd(), "src/lib/actions/next-goal.ts"),
      "utf8",
    );
    const seo = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(nextGoal, /Open Next step to review it/);
    assert.doesNotMatch(nextGoal, /Open Goals to review it/);
    assert.match(seo, /href="\/app\/next-step">Connect website/);
    assert.doesNotMatch(seo, /href="\/app\/website">Connect website/);
  });
});
