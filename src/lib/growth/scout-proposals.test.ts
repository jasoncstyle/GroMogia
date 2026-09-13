import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  SCOUT_STATUS_APPROVED,
  SCOUT_STATUS_PROPOSED,
  SCOUT_STATUS_SHIPPED,
  buildScoutGscExport,
  buildScoutPublicPages,
  describeBotTeam,
  describeScoutInboxHeading,
  nextScoutStatus,
  normalizeScoutSource,
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

describe("SEOgro proposal packs", () => {
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
    assert.match(empty.walls.join(" "), /POST the proposal pack back/);
    assert.match(empty.walls.join(" "), /DRAFTgro/);
    assert.match(empty.walls.join(" "), /BOOKSgro/);
    assert.match(empty.walls.join(" "), /Do not mix brands/);
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

  it("names the inbox SEOgro and does not publish or call Google", () => {
    assert.equal(
      describeScoutInboxHeading({ proposed: 0, approved: 0 }),
      "SEOgro proposals",
    );
    assert.match(
      describeScoutInboxHeading({ proposed: 2, approved: 1 }),
      /SEOgro proposals · 2 to review, 1 approved/,
    );
    const helper = readFileSync(join(process.cwd(), "src/lib/growth/scout-proposals.ts"), "utf8");
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/scout-proposals.ts"),
      "utf8",
    );
    const handoff = readFileSync(
      join(process.cwd(), "src/app/api/bots/scout/route.ts"),
      "utf8",
    );
    const page = readFileSync(join(process.cwd(), "src/app/(app)/app/seo/page.tsx"), "utf8");
    assert.match(helper, /Never set status to shipped/);
    assert.match(helper, /POST the proposal pack back/);
    assert.match(action, /parseScoutProposalPack/);
    assert.doesNotMatch(action, /requestCmsPublish|requestExecute|googleapis/i);
    assert.match(handoff, /recordScoutProposalPack/);
    assert.match(handoff, /via: \"handoff\"/);
    assert.match(handoff, /getScoutDeskPayload/);
    assert.match(handoff, /publicPages/);
    assert.match(handoff, /describeBotTeam/);
    assert.doesNotMatch(handoff, /googleapis|requestCmsPublish/i);
    assert.match(page, /ScoutProposalPanel/);
    assert.match(page, /getScoutDeskPayload/);
    assert.match(page, /publicPages/);
    assert.match(page, /api\/bots\/scout/);
    assert.match(page, /Search desk/);
    assert.match(page, /DRAFTgro, WRITEgro, and BOOKSgro/);
    assert.doesNotMatch(page, /SEO Scout|Draft Locker/);
    const panel = readFileSync(
      join(process.cwd(), "src/components/scout-proposal-panel.tsx"),
      "utf8",
    );
    assert.match(panel, /publicPages/);
    assert.match(panel, /gsc: gscExport, publicPages/);
  });

  it("accepts a public_pages pack and lists stored public URLs", () => {
    assert.equal(normalizeScoutSource("public_pages"), "public_pages");
    assert.equal(normalizeScoutSource("gsc + public_pages"), "gsc+public_pages");
    const pack = parseScoutProposalPack(`{
      "property": "harbor-lessons",
      "source": "public_pages",
      "items": [
        {
          "id": "h1-home",
          "type": "on_page_draft",
          "priority": "medium",
          "evidence": "Public homepage H1 does not name the offer.",
          "draft": "Weekday harbor lessons"
        }
      ]
    }`);
    assert.equal(pack.source, "public_pages");
    assert.deepEqual(
      buildScoutPublicPages([
        { url: "https://example.com/", title: "Home", label: "home" },
        { url: "", title: "skip" },
      ]),
      [{ url: "https://example.com/", title: "Home", label: "home" }],
    );
    const team = describeBotTeam();
    assert.equal(team.seogro.status, "live");
    assert.equal(team.draftgro.status, "live");
    assert.equal(team.writegro.status, "live");
    assert.equal(team.booksgro.status, "live");
  });
});
