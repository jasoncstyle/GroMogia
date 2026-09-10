import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GROWTH_ACTION_CONFIDENCE_INFERRED,
  GROWTH_ACTION_IMPACT_UNKNOWN,
  confidenceNote,
  expectedImpactNote,
  growthActionFacts,
  isEmptyEvidence,
} from "./action-evidence";

describe("growth action evidence", () => {
  it("turns stored Search Console numbers into labeled facts without parsing description", () => {
    const facts = growthActionFacts({
      source: "search_console",
      kind: "striking_distance",
      query: "ASA sailing lessons",
      impressions: 1240,
      position: 11.3,
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    assert.deepEqual(
      facts.map((fact) => fact.label),
      ["Search", "Search visibility", "Average position", "Measurement window"],
    );
    assert.equal(facts.find((fact) => fact.label === "Search visibility")?.value, "1,240 impressions");
    assert.equal(facts.find((fact) => fact.label === "Average position")?.value, "11.3");
    assert.match(confidenceNote(GROWTH_ACTION_CONFIDENCE_INFERRED), /not a guarantee/);
    assert.match(expectedImpactNote(GROWTH_ACTION_IMPACT_UNKNOWN), /not estimated/);
  });

  it("does not invent facts from empty evidence", () => {
    assert.equal(isEmptyEvidence({}), true);
    assert.equal(growthActionFacts({}).length, 0);
    assert.equal(confidenceNote(""), "");
    assert.equal(expectedImpactNote(""), "");
  });
});
