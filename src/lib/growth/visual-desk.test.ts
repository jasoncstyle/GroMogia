import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

describe("visual owner dashboard", () => {
  it("paints stored GroovGro numbers and does not invent shop metrics", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/page.tsx"),
      "utf8",
    );
    const desk = readFileSync(
      join(process.cwd(), "src/components/visual-desk.tsx"),
      "utf8",
    );
    assert.match(page, /DeskKpi/);
    assert.match(page, /DeskRing/);
    assert.match(page, /DeskSparkline/);
    assert.match(page, /DeskBars/);
    assert.match(page, /getScoutGscExport/);
    assert.match(page, /getScoutProposalInbox/);
    assert.match(page, /SEOgro proposals/);
    assert.match(page, /Open Search desk/);
    assert.match(desk, /Goal progress is not computed yet/);
    assert.doesNotMatch(page, /Page Views|Totalprofit|AI Assistant|Shopeeters/);
    assert.match(page, /GroovGro will not invent traffic/);
  });

  it("calls the analyst bot SEOgro on the Search desk and Integrations", () => {
    const seo = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/scout-proposal-panel.tsx"),
      "utf8",
    );
    const bots = readFileSync(
      join(process.cwd(), "src/components/bot-access-panel.tsx"),
      "utf8",
    );
    assert.match(seo, /SEOgro/);
    assert.doesNotMatch(seo, /SEO Scout/);
    assert.match(panel, /SEOgro wrote into GroovGro/);
    assert.match(panel, /Copy SEOgro handoff URL/);
    assert.doesNotMatch(panel, /SEO Scout/);
    assert.match(bots, /SEOgro reads that/);
    assert.match(bots, /SEOgro: GET the handoff URL/);
    assert.doesNotMatch(bots, /SEO Scout/);
  });
});
