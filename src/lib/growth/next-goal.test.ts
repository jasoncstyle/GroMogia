import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  alreadyDraftedNextGoal,
  canActivateDraftGoal,
  canDraftNextGoal,
  draftNextGoalFromReached,
  findActivateCandidate,
  isNextGoalDraft,
  nextGoalTarget,
  reachedGoalSource,
  sourceGoalIdFromInferred,
} from "./next-goal";

describe("next Goal after a reached Goal", () => {
  it("adds another increment of the same size", () => {
    assert.equal(nextGoalTarget(10, 10), 20);
    assert.equal(nextGoalTarget(12, 10), 22);
    assert.equal(nextGoalTarget(5, null), null);
    assert.equal(nextGoalTarget(5, 0), null);
  });

  it("drafts a reviewable next Goal without starting marketing", () => {
    const draft = draftNextGoalFromReached({
      id: "goal-1",
      title: "More people get in touch",
      goalType: "lead_generation",
      unit: "leads",
      currentValue: 10,
      targetValue: 10,
      offerId: null,
      successDefinition: "Ten people get in touch.",
      status: "achieved",
    });
    assert.equal(draft.title, "Next: More people get in touch");
    assert.equal(draft.baselineValue, 10);
    assert.equal(draft.targetValue, 20);
    assert.equal(draft.inferredFrom, reachedGoalSource("goal-1"));
    assert.match(draft.description, /will not start marketing/);
    assert.doesNotMatch(draft.description, /buy ads|TODO|lorem/i);
  });

  it("does not invent a target when the reached Goal had none", () => {
    const draft = draftNextGoalFromReached({
      id: "goal-2",
      title: "Be easier to find",
      goalType: "visibility",
      unit: "",
      currentValue: 4,
      targetValue: null,
      offerId: null,
      successDefinition: "",
      status: "achieved",
    });
    assert.equal(draft.targetValue, null);
    assert.match(draft.successDefinition, /will not invent/);
  });

  it("only offers a next Goal when the current one is reached", () => {
    assert.equal(canDraftNextGoal({ status: "achieved", currentValue: 3, targetValue: 10 }), true);
    assert.equal(canDraftNextGoal({ status: "active", currentValue: 10, targetValue: 10 }), true);
    assert.equal(canDraftNextGoal({ status: "active", currentValue: 3, targetValue: 10 }), false);
    assert.equal(
      alreadyDraftedNextGoal([{ inferredFrom: reachedGoalSource("goal-1") }], "goal-1"),
      true,
    );
    assert.equal(alreadyDraftedNextGoal([{ inferredFrom: "" }], "goal-1"), false);
  });

  it("activates only a reviewed draft Goal", () => {
    assert.equal(canActivateDraftGoal({ status: "draft" }), true);
    assert.equal(canActivateDraftGoal({ status: "draft", discoveryStatus: "confirmed" }), true);
    assert.equal(canActivateDraftGoal({ status: "draft", discoveryStatus: "inferred" }), false);
    assert.equal(canActivateDraftGoal({ status: "draft", discoveryStatus: "rejected" }), false);
    assert.equal(canActivateDraftGoal({ status: "active" }), false);
    assert.equal(canActivateDraftGoal({ status: "achieved" }), false);
  });

  it("finds a next Goal draft from a reached Goal", () => {
    assert.equal(sourceGoalIdFromInferred(reachedGoalSource("goal-1")), "goal-1");
    assert.equal(sourceGoalIdFromInferred("website"), null);
    assert.equal(isNextGoalDraft({ status: "draft", inferredFrom: reachedGoalSource("goal-1") }), true);
    assert.equal(isNextGoalDraft({ status: "active", inferredFrom: reachedGoalSource("goal-1") }), false);
    const picked = findActivateCandidate([
      { status: "draft", inferredFrom: "website", discoveryStatus: "inferred" },
      { status: "draft", inferredFrom: reachedGoalSource("goal-1"), discoveryStatus: "confirmed" },
      { status: "draft", inferredFrom: "", discoveryStatus: "confirmed" },
    ]);
    assert.equal(picked?.inferredFrom, reachedGoalSource("goal-1"));
    assert.equal(findActivateCandidate([{ status: "draft", inferredFrom: "", discoveryStatus: "confirmed" }]), null);
  });

  it("does not bake industry-specific words into next-goal helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/next-goal.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
