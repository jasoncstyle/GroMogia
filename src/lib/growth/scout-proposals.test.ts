import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  SCOUT_STATUS_APPROVED,
  SCOUT_STATUS_PROPOSED,
  SCOUT_STATUS_SHIPPED,
  buildScoutGscExport,
  nextScoutStatus,
  parseScoutProposalPack,
} from "./scout-proposals";

const PACK = `{
  "property": "harbor-lessons",
  "source": "gsc",
  "sourceRange": "2026-09-01 to 2026-09-07",
  "items": [
    {
      "id": "title-home",
      "type": "on_page_draft",
      "priority": "high",
      "evidence": "Stored query “harbor lessons” has 400 impressions and position 14.",
      "draft": "Harbor lessons | book a weekday on the water",
      "expectedEffect": "Clearer title for that stored query."
    }
  ]
}`;

describe("SEO Scout proposal packs", () => {
  it("parses a pack as proposals and ignores a shipped status from Scout", () => {
    const pack = parseScoutProposalPack(PACK);
    assert.equal(pack.property, "harbor-lessons");
    assert.equal(pack.items[0]?.status, SCOUT_STATUS_PROPOSED);
    assert.equal(pack.items[0]?.priority, 20);
    const shipped = JSON.parse(PACK) as { items: Array<{ status?: string }> };
    shipped.items[0]!.status = "shipped";
    assert.throws(
      () => parseScoutProposalPack(JSON.stringify(shipped)),
      /cannot mark work shipped/,
    );
  });

  it("does not invent a pack from free text or an empty list", () => {
    assert.throws(() => parseScoutProposalPack("please fix SEO"), /must be JSON/);
    assert.throws(
      () => parseScoutProposalPack('{"property":"harbor-lessons","items":[]}'),
      /no items/,
    );
  });

  it("only ships after GroovGro has an approved item", () => {
    assert.equal(nextScoutStatus(SCOUT_STATUS_PROPOSED, "approve"), SCOUT_STATUS_APPROVED);
    assert.equal(nextScoutStatus(SCOUT_STATUS_APPROVED, "ship"), SCOUT_STATUS_SHIPPED);
    assert.throws(() => nextScoutStatus(SCOUT_STATUS_PROPOSED, "ship"), /approved item/);
  });

  it("exports stored Search Console with walls and names gaps", () => {
    const empty = buildScoutGscExport({});
    assert.equal(empty.source, "gsc");
    assert.ok(empty.gaps.some((gap) => /No query rows/.test(gap)));
    assert.match(empty.walls.join(" "), /Do not log into Google/);
    const full = buildScoutGscExport({
      propertyUrl: "https://example.com/",
      startDate: "2026-09-01",
      endDate: "2026-09-07",
      totals: { clicks: 4, impressions: 100, ctr: 0.04, position: 12 },
      queries: [{ query: "harbor lessons", clicks: 2, impressions: 40, ctr: 0.05, position: 14 }],
      pages: [{ page: "https://example.com/", clicks: 2, impressions: 40, ctr: 0.05, position: 8 }],
    });
    assert.equal(full.queries[0]?.query, "harbor lessons");
    assert.equal(full.gaps.length, 0);
  });

  it("keeps Scout as proposals and does not publish or call Google", () => {
    const helper = readFileSync(join(process.cwd(), "src/lib/growth/scout-proposals.ts"), "utf8");
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/scout-proposals.ts"),
      "utf8",
    );
    const page = readFileSync(join(process.cwd(), "src/app/(app)/app/seo/page.tsx"), "utf8");
    assert.match(helper, /Never set status to shipped/);
    assert.match(action, /parseScoutProposalPack/);
    assert.doesNotMatch(action, /requestCmsPublish|requestExecute|googleapis/i);
    assert.match(page, /ScoutProposalPanel/);
    assert.match(page, /Search desk/);
  });
});
