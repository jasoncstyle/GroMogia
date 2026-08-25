import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mergeAttributionRows,
  normalizeAttributionCampaign,
  normalizeAttributionSource,
} from "./attribution";

describe("attribution merge", () => {
  it("treats blank sources as unattributed", () => {
    assert.equal(normalizeAttributionSource(""), "unattributed");
    assert.equal(normalizeAttributionSource(" Google "), "google");
  });

  it("rolls visits, leads, customers, and revenue into one row per source", () => {
    const rows = mergeAttributionRows({
      visits: [
        { source: "direct", count: 3 },
        { source: "google", count: 2 },
      ],
      leads: [{ source: "website", count: 1 }],
      customers: [{ source: "stripe", count: 1 }],
      revenue: [
        { source: "stripe", cents: 500 },
        { source: "stripe", cents: 1000 },
      ],
    });

    const stripe = rows.find((row) => row.source === "stripe");
    const direct = rows.find((row) => row.source === "direct");
    assert.equal(stripe?.customers, 1);
    assert.equal(stripe?.revenueCents, 1500);
    assert.equal(direct?.visits, 3);
    assert.equal(rows[0].source, "stripe");
    assert.equal(rows[0].campaign, "");
  });

  it("keeps two share names on the same source as separate rows", () => {
    assert.equal(normalizeAttributionCampaign(" Spring Open House "), "spring open house");
    const rows = mergeAttributionRows({
      visits: [],
      leads: [
        { source: "instagram", campaign: "spring-open-house", count: 2 },
        { source: "instagram", campaign: "fall-sale", count: 1 },
      ],
      customers: [],
      revenue: [],
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].source, "instagram");
    assert.equal(rows[0].campaign, "spring-open-house");
    assert.equal(rows[0].leads, 2);
    assert.equal(rows[1].campaign, "fall-sale");
  });
});
