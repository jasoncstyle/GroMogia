import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { requestGeoLookup } from "./adapter";
import { GEO_EVIDENCE_OWNER } from "./architecture";
import {
  describeGeoQueriesHeading,
  describeGeoQuery,
  GEO_QUERY_SOURCE_OWNER,
  GEO_QUERY_STATUS_PLANNED,
  planGeoQuery,
  sortGeoQueriesForPanel,
} from "./queries";
import { configuredGeoProvider, geoLookupEnabled } from "./provider";

const ORG_A = "11111111-1111-1111-1111-111111111111";

describe("GEO query library and disabled adapter", () => {
  it("plans an owner question with a normalized key", () => {
    const draft = planGeoQuery({
      organizationId: ORG_A,
      query: "  Who should I hire nearby  ",
      why: "  People already ask this.  ",
    });
    assert.equal(draft.organizationId, ORG_A);
    assert.equal(draft.query, "Who should I hire nearby");
    assert.equal(draft.queryKey, "who should i hire nearby");
    assert.equal(draft.why, "People already ask this.");
    assert.equal(draft.source, GEO_QUERY_SOURCE_OWNER);
    assert.equal(draft.source, GEO_EVIDENCE_OWNER);
    assert.equal(draft.status, GEO_QUERY_STATUS_PLANNED);
    assert.equal(
      describeGeoQuery({
        query: "Who should I hire nearby",
        why: "People already ask this.",
      }),
      "Remember: “Who should I hire nearby”. People already ask this.",
    );
  });

  it("requires an organization and a question", () => {
    assert.throws(
      () => planGeoQuery({ organizationId: "", query: "Who should I hire?" }),
      /Missing organization/,
    );
    assert.throws(
      () => planGeoQuery({ organizationId: ORG_A, query: "   " }),
      /Add a question to remember/,
    );
  });

  it("keeps the adapter off and never asks an AI system", () => {
    assert.equal(configuredGeoProvider(), "none");
    assert.equal(geoLookupEnabled(), false);
    const refused = requestGeoLookup({
      organizationId: ORG_A,
      query: "Who should I hire nearby",
    });
    assert.equal(refused.status, "off");
    assert.match(refused.reason, /will not ask an AI system/);
    assert.equal(
      requestGeoLookup({ organizationId: "", query: "Who should I hire?" }).status,
      "off",
    );
  });

  it("does not fetch, scrape, hard-code vendors, or create a Next step", () => {
    const helper = readFileSync(join(process.cwd(), "src/lib/geo/queries.ts"), "utf8");
    const adapter = readFileSync(join(process.cwd(), "src/lib/geo/adapter.ts"), "utf8");
    const provider = readFileSync(join(process.cwd(), "src/lib/geo/provider.ts"), "utf8");
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/geo-queries.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/geo-queries-panel.tsx"),
      "utf8",
    );
    const queries = readFileSync(
      join(process.cwd(), "src/lib/phase6/queries.ts"),
      "utf8",
    );

    for (const source of [helper, adapter, provider, action, panel, queries]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(
        source,
        /chatgpt|perplexity|gemini|claude|grok|deepseek/i,
      );
    }
    assert.doesNotMatch(action, /requestGeoLookup|geoLookupEnabled\(\)/);
    assert.match(action, /session\.organizationId/);
    assert.match(action, /did not ask an AI system/);
    assert.match(panel, /will not ask an AI/);
    assert.match(panel, /describeGeoQueriesHeading/);
    assert.match(panel, /sortGeoQueriesForPanel/);
    assert.deepEqual(
      sortGeoQueriesForPanel([
        { query: "Who to hire for harbor day trips", why: "I already ask this." },
        { query: "Weekend beginner class nearby", why: "" },
        { query: "Private coaching", why: "  " },
      ]).map((row) => row.query),
      [
        "Weekend beginner class nearby",
        "Private coaching",
        "Who to hire for harbor day trips",
      ],
    );
    assert.equal(
      describeGeoQueriesHeading(0),
      "Questions to remember for later AI visibility",
    );
    assert.equal(
      describeGeoQueriesHeading(2),
      "Questions to remember for later AI visibility · 2",
    );
    assert.match(panel, /scrape answers/);
    assert.match(adapter, /never fetches/);
    assert.match(queries, /eq\(geoQueries\.organizationId, organizationId\)/);

    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    assert.doesNotMatch(nextStep, /geoQuery|geo_query|Save question to the library/);
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /GeoQueriesPanel/);
    const catalog = readFileSync(
      join(process.cwd(), "src/lib/modules/catalog.ts"),
      "utf8",
    );
    assert.doesNotMatch(catalog, /ai_visibility/);
  });
});
