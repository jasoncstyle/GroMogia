import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { GEO_EVIDENCE_OWNER, isOwnerGeoEvidence } from "./architecture";
import { describeGeoNote, planGeoNote, GEO_NOTE_SOURCE_OWNER } from "./notes";
import { configuredGeoProvider, geoLookupEnabled } from "./provider";

const ORG_A = "11111111-1111-1111-1111-111111111111";

describe("owner-entered GEO notes", () => {
  it("plans an owner note with a normalized query and organization id", () => {
    const draft = planGeoNote({
      organizationId: ORG_A,
      query: "  Who to hire for harbor day trips  ",
      place: "  An AI chat I already use  ",
      heard: "  They named us first.  ",
      note: "  I asked last week.  ",
    });
    assert.equal(draft.organizationId, ORG_A);
    assert.equal(draft.query, "Who to hire for harbor day trips");
    assert.equal(draft.queryKey, "who to hire for harbor day trips");
    assert.equal(draft.place, "An AI chat I already use");
    assert.equal(draft.heard, "They named us first.");
    assert.equal(draft.note, "I asked last week.");
    assert.equal(draft.source, GEO_NOTE_SOURCE_OWNER);
    assert.equal(draft.source, GEO_EVIDENCE_OWNER);
    assert.equal(isOwnerGeoEvidence(draft.source), true);
  });

  it("allows a note without a query or place", () => {
    const draft = planGeoNote({
      organizationId: ORG_A,
      heard: "They named someone else.",
    });
    assert.equal(draft.query, "");
    assert.equal(draft.queryKey, "");
    assert.equal(draft.place, "");
    assert.equal(
      describeGeoNote({
        query: "",
        place: "",
        heard: "They named someone else.",
      }),
      "The owner already heard: They named someone else.",
    );
    assert.equal(
      describeGeoNote({
        query: "who to hire nearby",
        place: "an AI chat",
        heard: "They named us.",
      }),
      "The owner already asked “who to hire nearby” in an AI chat and heard: They named us.",
    );
  });

  it("requires an organization and what the owner already heard", () => {
    assert.throws(
      () => planGeoNote({ organizationId: "", heard: "They named us." }),
      /Missing organization/,
    );
    assert.throws(
      () => planGeoNote({ organizationId: ORG_A, heard: "   " }),
      /Add what you already heard/,
    );
  });

  it("keeps GEO lookup off and does not fetch, scrape, or hard-code vendors", () => {
    assert.equal(configuredGeoProvider(), "none");
    assert.equal(geoLookupEnabled(), false);

    const helper = readFileSync(join(process.cwd(), "src/lib/geo/notes.ts"), "utf8");
    const architecture = readFileSync(
      join(process.cwd(), "src/lib/geo/architecture.ts"),
      "utf8",
    );
    const provider = readFileSync(
      join(process.cwd(), "src/lib/geo/provider.ts"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/geo-notes.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/geo-notes-panel.tsx"),
      "utf8",
    );
    const queries = readFileSync(
      join(process.cwd(), "src/lib/phase6/queries.ts"),
      "utf8",
    );

    for (const source of [helper, architecture, provider, action, panel, queries]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(
        source,
        /chatgpt|perplexity|gemini|claude|grok|deepseek/i,
      );
    }
    assert.doesNotMatch(action, /geoLookupEnabled\(\)/);
    assert.match(action, /session\.organizationId/);
    assert.match(action, /did not ask an AI system/);
    assert.match(panel, /will not ask AI systems/);
    assert.match(panel, /scrape answers/);
    assert.match(panel, /treat\s+one answer as truth/);
    assert.match(provider, /does not scrape AI answers/);
    assert.match(architecture, /Do not add a hard-coded vendor list/);
    assert.match(queries, /eq\(geoNotes\.organizationId, organizationId\)/);

    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    assert.doesNotMatch(nextStep, /geoNote|geo_note|Save an AI visibility/);
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /GeoNotesPanel/);
    const catalog = readFileSync(
      join(process.cwd(), "src/lib/modules/catalog.ts"),
      "utf8",
    );
    assert.doesNotMatch(catalog, /ai_visibility/);
  });
});
