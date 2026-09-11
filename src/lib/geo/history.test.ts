import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { requestGeoLookup } from "./adapter";
import { GEO_EVIDENCE_OWNER } from "./architecture";
import {
  describeGeoHistory,
  GEO_ANSWER_NO,
  GEO_ANSWER_UNSURE,
  GEO_ANSWER_YES,
  GEO_HISTORY_SOURCE_OWNER,
  historyToShow,
  planGeoHistory,
} from "./history";
import { configuredGeoProvider, geoLookupEnabled } from "./provider";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const QUERY_A = "33333333-3333-3333-3333-333333333333";

describe("owner-entered GEO history", () => {
  it("plans a new snapshot without overwriting earlier ones", () => {
    const draft = planGeoHistory({
      organizationId: ORG_A,
      queryId: QUERY_A,
      query: "  Who should I hire nearby  ",
      queryKey: "who should i hire nearby",
      mentioned: GEO_ANSWER_YES,
      cited: GEO_ANSWER_NO,
      note: "  I already asked last week.  ",
    });
    assert.equal(draft.organizationId, ORG_A);
    assert.equal(draft.queryId, QUERY_A);
    assert.equal(draft.query, "Who should I hire nearby");
    assert.equal(draft.mentioned, GEO_ANSWER_YES);
    assert.equal(draft.cited, GEO_ANSWER_NO);
    assert.equal(draft.note, "I already asked last week.");
    assert.equal(draft.source, GEO_HISTORY_SOURCE_OWNER);
    assert.equal(draft.source, GEO_EVIDENCE_OWNER);
    assert.equal(
      describeGeoHistory({
        query: "Who should I hire nearby",
        mentioned: GEO_ANSWER_YES,
        cited: GEO_ANSWER_NO,
      }),
      "For “Who should I hire nearby”, the owner already heard mentioned: yes, cited: no.",
    );
    assert.equal(historyToShow(new Array(15).fill(null).map((_, index) => ({
      id: String(index),
      queryId: QUERY_A,
      query: "Who should I hire nearby",
      mentioned: GEO_ANSWER_UNSURE,
      cited: GEO_ANSWER_UNSURE,
      note: "",
      createdAt: new Date(0),
    }))).length, 12);
  });

  it("requires an organization, a library question, and a mention answer", () => {
    assert.throws(
      () =>
        planGeoHistory({
          organizationId: "",
          queryId: QUERY_A,
          query: "Who should I hire?",
          mentioned: GEO_ANSWER_YES,
        }),
      /Missing organization/,
    );
    assert.throws(
      () =>
        planGeoHistory({
          organizationId: ORG_A,
          queryId: "",
          query: "Who should I hire?",
          mentioned: GEO_ANSWER_YES,
        }),
      /Pick a saved library question/,
    );
    assert.throws(
      () =>
        planGeoHistory({
          organizationId: ORG_A,
          queryId: QUERY_A,
          query: "Who should I hire?",
          mentioned: "maybe",
        }),
      /whether the business was mentioned/,
    );
    const unsureCite = planGeoHistory({
      organizationId: ORG_A,
      queryId: QUERY_A,
      query: "Who should I hire?",
      mentioned: GEO_ANSWER_NO,
    });
    assert.equal(unsureCite.cited, GEO_ANSWER_UNSURE);
  });

  it("does not fetch, scrape, ask an AI system, or create a Next step", () => {
    assert.equal(configuredGeoProvider(), "none");
    assert.equal(geoLookupEnabled(), false);
    assert.equal(
      requestGeoLookup({ organizationId: ORG_A, query: "Who should I hire?" }).status,
      "off",
    );

    const helper = readFileSync(join(process.cwd(), "src/lib/geo/history.ts"), "utf8");
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/geo-history.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/geo-history-panel.tsx"),
      "utf8",
    );
    const queries = readFileSync(
      join(process.cwd(), "src/lib/phase6/queries.ts"),
      "utf8",
    );
    for (const source of [helper, action, panel, queries]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(
        source,
        /chatgpt|perplexity|gemini|claude|grok|deepseek/i,
      );
    }
    assert.doesNotMatch(action, /requestGeoLookup|geoLookupEnabled\(\)/);
    assert.doesNotMatch(action, /onConflictDoUpdate|onConflictDoNothing/);
    assert.match(action, /session\.organizationId/);
    assert.match(action, /eq\(geoQueries\.organizationId, session\.organizationId\)/);
    assert.match(action, /did not ask an AI system/);
    assert.match(panel, /will not ask an AI system/);
    assert.match(panel, /treat one answer as truth/);
    assert.match(queries, /eq\(geoHistory\.organizationId, organizationId\)/);

    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    assert.doesNotMatch(nextStep, /geoHistory|geo_history|Save visibility history/);
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /GeoHistoryPanel/);
    const catalog = readFileSync(
      join(process.cwd(), "src/lib/modules/catalog.ts"),
      "utf8",
    );
    assert.doesNotMatch(catalog, /ai_visibility/);
  });
});
