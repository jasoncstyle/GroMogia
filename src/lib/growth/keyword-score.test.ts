import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  compareKeywordScores,
  keywordScoreLabelTitle,
  scoreKeywordOpportunity,
} from "./keyword-score";
import type { KeywordHistoryPoint } from "./keywords";

function point(
  overrides: Partial<KeywordHistoryPoint> = {},
): KeywordHistoryPoint {
  return {
    startDate: "2026-08-01",
    endDate: "2026-08-28",
    clicks: 4,
    impressions: 400,
    ctr: 0.01,
    position: 12.4,
    ...overrides,
  };
}

describe("keyword opportunity scoring", () => {
  it("keeps tiny Search Console rows as not enough evidence", () => {
    const scored = scoreKeywordOpportunity([
      point({ impressions: 3, clicks: 0, position: 60.7, ctr: 0 }),
    ]);
    assert.equal(scored.label, "none");
    assert.equal(keywordScoreLabelTitle(scored.label), "Not enough evidence");
    assert.match(scored.why, /more Search Console evidence/);
    assert.match(scored.why, /not search volume or a traffic forecast/);
    assert.equal(scored.confidence, "inferred");
    assert.ok(scored.score < 40);
  });

  it("marks a striking-distance query worth a look", () => {
    const scored = scoreKeywordOpportunity([point()]);
    assert.equal(scored.label, "review");
    assert.equal(keywordScoreLabelTitle(scored.label), "Worth a look");
    assert.match(scored.why, /visible but not a strong page-one result/);
    assert.ok(scored.score >= 40);
  });

  it("watches mid-size queries without treating them as a recommendation", () => {
    const scored = scoreKeywordOpportunity([
      point({ impressions: 24, clicks: 1, position: 32, ctr: 0.04 }),
    ]);
    assert.equal(scored.label, "watch");
    assert.match(scored.why, /not enough evidence yet/);
  });

  it("sorts review above watch above none", () => {
    const rows = [
      { label: "none" as const, score: 80, impressions: 3 },
      { label: "watch" as const, score: 20, impressions: 24 },
      { label: "review" as const, score: 50, impressions: 400 },
    ];
    rows.sort(compareKeywordScores);
    assert.deepEqual(
      rows.map((row) => row.label),
      ["review", "watch", "none"],
    );
  });

  it("does not invent search volume or scrape a SERP", () => {
    const helper = readFileSync(join(process.cwd(), "src/lib/growth/keyword-score.ts"), "utf8");
    const persist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-keywords.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/keyword-history-panel.tsx"),
      "utf8",
    );
    assert.doesNotMatch(helper, /fetch\(/);
    assert.doesNotMatch(helper, /searchVolume|serp|competitor/i);
    assert.match(persist, /scoreKeywordOpportunity/);
    assert.match(persist, /eq\(keywords\.organizationId, organizationId\)/);
    assert.match(panel, /not search volume or a traffic forecast/);
  });
});
