import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeAttributionRows, normalizeAttributionSource } from "./attribution";

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
  });
});
