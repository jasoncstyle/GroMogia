import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  describeSerpNote,
  planSerpNote,
  SERP_NOTE_SOURCE_OWNER,
} from "./serp-notes";
import { configuredSerpProvider, serpLookupEnabled } from "./serp-provider";

const ORG_A = "11111111-1111-1111-1111-111111111111";

describe("owner-entered SERP notes", () => {
  it("plans an owner note with a normalized query and organization id", () => {
    const draft = planSerpNote({
      organizationId: ORG_A,
      query: "  Weekend beginner class  ",
      competitorName: "  Harbor Tours  ",
      note: "  They already show for this search.  ",
    });
    assert.equal(draft.organizationId, ORG_A);
    assert.equal(draft.query, "Weekend beginner class");
    assert.equal(draft.queryKey, "weekend beginner class");
    assert.equal(draft.competitorName, "Harbor Tours");
    assert.equal(draft.note, "They already show for this search.");
    assert.equal(draft.source, SERP_NOTE_SOURCE_OWNER);
  });

  it("allows a competitor note without a query", () => {
    const draft = planSerpNote({
      organizationId: ORG_A,
      competitorName: "Harbor Tours",
    });
    assert.equal(draft.query, "");
    assert.equal(draft.queryKey, "");
    assert.equal(draft.source, SERP_NOTE_SOURCE_OWNER);
    assert.equal(
      describeSerpNote({ query: "", competitorName: "Harbor Tours" }),
      "The owner already knows Harbor Tours.",
    );
    assert.equal(
      describeSerpNote({
        query: "weekend beginner class",
        competitorName: "Harbor Tours",
      }),
      "For “weekend beginner class”, the owner already sees Harbor Tours.",
    );
  });

  it("requires an organization and a competitor the owner already knows", () => {
    assert.throws(
      () => planSerpNote({ organizationId: "", competitorName: "Harbor Tours" }),
      /Missing organization/,
    );
    assert.throws(
      () => planSerpNote({ organizationId: ORG_A, competitorName: "   " }),
      /Add a competitor you already know/,
    );
  });

  it("keeps SERP lookup off and does not fetch or scrape", () => {
    assert.equal(configuredSerpProvider(), "none");
    assert.equal(serpLookupEnabled(), false);

    const helper = readFileSync(join(process.cwd(), "src/lib/growth/serp-notes.ts"), "utf8");
    const provider = readFileSync(
      join(process.cwd(), "src/lib/growth/serp-provider.ts"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/serp-notes.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/serp-notes-panel.tsx"),
      "utf8",
    );
    const queries = readFileSync(
      join(process.cwd(), "src/lib/phase6/queries.ts"),
      "utf8",
    );

    for (const source of [helper, provider, action, panel, queries]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|serpApi|dataforseo/i);
    }
    assert.doesNotMatch(action, /serpLookupEnabled\(\)/);
    assert.match(action, /session\.organizationId/);
    assert.match(action, /did not look anyone up/);
    assert.match(panel, /will\s+not look these businesses up/);
    assert.match(panel, /scrape search results/);
    assert.match(panel, /buy a SERP\s+vendor/);
    assert.match(provider, /does not scrape search results/);
    assert.match(queries, /eq\(serpNotes\.organizationId, organizationId\)/);

    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    assert.doesNotMatch(nextStep, /serpNote|serp_note|Save a competitor/);
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /SerpNotesPanel/);
  });
});
