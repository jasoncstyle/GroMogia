import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  describeKeywordHistory,
  planKeywordHistory,
  type KeywordSnapshotInput,
} from "./keywords";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

function snapshot(
  overrides: Partial<KeywordSnapshotInput> &
    Pick<KeywordSnapshotInput, "id" | "createdAt" | "startDate" | "endDate">,
): KeywordSnapshotInput {
  return {
    organizationId: ORG_A,
    propertyUrl: "https://example.com/",
    topQueries: [],
    ...overrides,
  };
}

describe("keyword history from Search Console", () => {
  it("stores one keyword per normalized query and keeps snapshot history", () => {
    const plan = planKeywordHistory({
      organizationId: ORG_A,
      snapshots: [
        snapshot({
          id: "snap-1",
          createdAt: new Date("2026-08-01T00:00:00Z"),
          startDate: "2026-07-01",
          endDate: "2026-07-28",
          topQueries: [
            {
              key: "  Weekend beginner class  ",
              clicks: 4,
              impressions: 400,
              ctr: 0.01,
              position: 12.4,
            },
            { key: "   ", clicks: 1, impressions: 10, ctr: 0.1, position: 3 },
          ],
        }),
        snapshot({
          id: "snap-2",
          createdAt: new Date("2026-09-01T00:00:00Z"),
          startDate: "2026-08-01",
          endDate: "2026-08-28",
          topQueries: [
            {
              key: "weekend beginner class",
              clicks: 9,
              impressions: 520,
              ctr: 0.017,
              position: 10.1,
            },
          ],
        }),
      ],
    });

    assert.equal(plan.keywordsToUpsert.length, 1);
    assert.equal(plan.keywordsToUpsert[0]?.queryKey, "weekend beginner class");
    assert.equal(plan.keywordsToUpsert[0]?.query, "weekend beginner class");
    assert.equal(plan.keywordsToUpsert[0]?.source, "search_console");
    assert.equal(plan.historyToInsert.length, 2);
    assert.equal(plan.historyToInsert[0]?.impressions, 400);
    assert.equal(plan.historyToInsert[1]?.impressions, 520);
    assert.equal(
      Object.prototype.hasOwnProperty.call(plan.keywordsToUpsert[0], "opportunityScore"),
      false,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(plan.historyToInsert[0], "searchVolume"),
      false,
    );
  });

  it("skips history already stored for the same snapshot and other organizations", () => {
    const plan = planKeywordHistory({
      organizationId: ORG_A,
      snapshots: [
        snapshot({
          id: "snap-1",
          createdAt: new Date("2026-08-01T00:00:00Z"),
          startDate: "2026-07-01",
          endDate: "2026-07-28",
          topQueries: [
            {
              key: "harbor tours",
              clicks: 2,
              impressions: 180,
              ctr: 0.011,
              position: 14,
            },
          ],
        }),
        snapshot({
          id: "snap-other",
          organizationId: ORG_B,
          createdAt: new Date("2026-08-02T00:00:00Z"),
          startDate: "2026-07-01",
          endDate: "2026-07-28",
          topQueries: [
            {
              key: "other business query",
              clicks: 20,
              impressions: 2000,
              ctr: 0.01,
              position: 4,
            },
          ],
        }),
      ],
      existingHistory: [
        { organizationId: ORG_A, queryKey: "harbor tours", snapshotId: "snap-1" },
        { organizationId: ORG_B, queryKey: "harbor tours", snapshotId: "snap-1" },
      ],
    });

    assert.equal(plan.keywordsToUpsert.length, 1);
    assert.equal(plan.historyToInsert.length, 0);
  });

  it("describes stored history without inventing a score", () => {
    const text = describeKeywordHistory([
      {
        startDate: "2026-07-01",
        endDate: "2026-07-28",
        clicks: 4,
        impressions: 400,
        ctr: 0.01,
        position: 12.4,
      },
      {
        startDate: "2026-08-01",
        endDate: "2026-08-28",
        clicks: 9,
        impressions: 520,
        ctr: 0.017,
        position: 10.1,
      },
    ]);
    assert.match(text, /2 Search Console snapshots/);
    assert.match(text, /400 to 520/);
    assert.match(text, /12\.4 to 10\.1/);
    assert.doesNotMatch(text, /score|volume|opportunity/i);
  });

  it("does not fetch, scrape, or score keywords from a vendor", () => {
    const helper = readFileSync(join(process.cwd(), "src/lib/growth/keywords.ts"), "utf8");
    const persist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-keywords.ts"),
      "utf8",
    );
    assert.doesNotMatch(helper, /fetch\(/);
    assert.doesNotMatch(persist, /fetch\(/);
    assert.doesNotMatch(persist, /searchVolume|keyword vendor/i);
    assert.match(persist, /eq\(searchConsoleSnapshots\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(keywords\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(keywordHistory\.organizationId, organizationId\)/);
    assert.match(persist, /organizationId,/);
    const seoPersist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-seo-actions.ts"),
      "utf8",
    );
    assert.match(seoPersist, /persistKeywordHistory/);

    const panel = readFileSync(
      join(process.cwd(), "src/components/keyword-history-panel.tsx"),
      "utf8",
    );
    assert.match(panel, /not search volume or a traffic forecast/);
    assert.doesNotMatch(panel, /search volume forecast/i);
  });
});
