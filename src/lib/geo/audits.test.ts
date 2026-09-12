import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { requestGeoLookup } from "./adapter";
import {
  auditsToShow,
  describeCitationGapsHeading,
  describeGeoAudit,
  GEO_AUDIT_SOURCE_STORED_HISTORY,
  GEO_AUDIT_STATUS_COVERED,
  GEO_AUDIT_STATUS_GAP,
  latestSnapshotForQuery,
  planGeoAudits,
  type GeoAuditQuery,
  type GeoAuditSnapshot,
} from "./audits";
import {
  GEO_ANSWER_NO,
  GEO_ANSWER_UNSURE,
  GEO_ANSWER_YES,
} from "./history";
import { configuredGeoProvider, geoLookupEnabled } from "./provider";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const QUERY_A = "33333333-3333-3333-3333-333333333333";
const HISTORY_OLD = "44444444-4444-4444-4444-444444444444";
const HISTORY_NEW = "55555555-5555-5555-5555-555555555555";

function query(overrides: Partial<GeoAuditQuery> = {}): GeoAuditQuery {
  return {
    id: QUERY_A,
    organizationId: ORG_A,
    query: "Who should I hire nearby",
    queryKey: "who should i hire nearby",
    ...overrides,
  };
}

function snapshot(overrides: Partial<GeoAuditSnapshot> = {}): GeoAuditSnapshot {
  return {
    id: HISTORY_NEW,
    organizationId: ORG_A,
    queryId: QUERY_A,
    query: "Who should I hire nearby",
    queryKey: "who should i hire nearby",
    mentioned: GEO_ANSWER_YES,
    cited: GEO_ANSWER_NO,
    createdAt: new Date("2026-09-11T12:00:00.000Z"),
    ...overrides,
  };
}

describe("GEO audits from saved history", () => {
  it("marks a citation gap from the latest saved snapshot", () => {
    const plan = planGeoAudits({
      organizationId: ORG_A,
      queries: [query()],
      history: [snapshot()],
    });

    assert.equal(plan.toUpsert.length, 1);
    assert.equal(plan.toUpsert[0]?.status, GEO_AUDIT_STATUS_GAP);
    assert.equal(plan.toUpsert[0]?.organizationId, ORG_A);
    assert.equal(plan.toUpsert[0]?.queryId, QUERY_A);
    assert.equal(plan.toUpsert[0]?.historyId, HISTORY_NEW);
    assert.equal(plan.toUpsert[0]?.source, GEO_AUDIT_SOURCE_STORED_HISTORY);
    assert.match(plan.toUpsert[0]?.why ?? "", /not cited/);
    assert.match(plan.toUpsert[0]?.why ?? "", /not a live AI answer/);
    assert.equal(auditsToShow(plan.toUpsert).length, 1);
    assert.equal(
      describeGeoAudit({
        query: "Who should I hire nearby",
        mentioned: GEO_ANSWER_YES,
        cited: GEO_ANSWER_NO,
      }),
      "For “Who should I hire nearby”, the latest saved snapshot said mentioned: yes, cited: no.",
    );
  });

  it("marks a mention gap and covers only when both answers are yes", () => {
    const missingMention = planGeoAudits({
      organizationId: ORG_A,
      queries: [query()],
      history: [snapshot({ mentioned: GEO_ANSWER_NO, cited: GEO_ANSWER_UNSURE })],
    });
    assert.equal(missingMention.toUpsert[0]?.status, GEO_AUDIT_STATUS_GAP);
    assert.match(missingMention.toUpsert[0]?.why ?? "", /not mentioned/);

    const covered = planGeoAudits({
      organizationId: ORG_A,
      queries: [query()],
      history: [snapshot({ mentioned: GEO_ANSWER_YES, cited: GEO_ANSWER_YES })],
    });
    assert.equal(covered.toUpsert[0]?.status, GEO_AUDIT_STATUS_COVERED);
    assert.equal(auditsToShow(covered.toUpsert).length, 0);
    assert.match(covered.toUpsert[0]?.why ?? "", /will not treat one answer as truth/);
  });

  it("uses the latest snapshot and skips unsure answers", () => {
    const latest = latestSnapshotForQuery(
      [
        snapshot({
          id: HISTORY_OLD,
          cited: GEO_ANSWER_NO,
          createdAt: new Date("2026-09-01T12:00:00.000Z"),
        }),
        snapshot({
          id: HISTORY_NEW,
          cited: GEO_ANSWER_YES,
          mentioned: GEO_ANSWER_YES,
          createdAt: new Date("2026-09-11T12:00:00.000Z"),
        }),
      ],
      QUERY_A,
    );
    assert.equal(latest?.id, HISTORY_NEW);

    const newerCovered = planGeoAudits({
      organizationId: ORG_A,
      queries: [query()],
      history: [
        snapshot({
          id: HISTORY_OLD,
          cited: GEO_ANSWER_NO,
          createdAt: new Date("2026-09-01T12:00:00.000Z"),
        }),
        snapshot({
          id: HISTORY_NEW,
          cited: GEO_ANSWER_YES,
          mentioned: GEO_ANSWER_YES,
          createdAt: new Date("2026-09-11T12:00:00.000Z"),
        }),
      ],
    });
    assert.equal(newerCovered.toUpsert[0]?.status, GEO_AUDIT_STATUS_COVERED);
    assert.equal(newerCovered.toUpsert[0]?.historyId, HISTORY_NEW);

    const unsure = planGeoAudits({
      organizationId: ORG_A,
      queries: [query()],
      history: [
        snapshot({ mentioned: GEO_ANSWER_UNSURE, cited: GEO_ANSWER_UNSURE }),
      ],
    });
    assert.equal(unsure.toUpsert.length, 0);
    assert.equal(unsure.skipped[0]?.reason, "not_enough_evidence");
  });

  it("does not invent gaps without an organization or saved history", () => {
    const missingOrg = planGeoAudits({
      organizationId: "",
      queries: [query()],
      history: [snapshot()],
    });
    assert.equal(missingOrg.toUpsert.length, 0);
    assert.equal(missingOrg.skipped[0]?.reason, "tenant_mismatch");

    const noHistory = planGeoAudits({
      organizationId: ORG_A,
      queries: [query()],
      history: [],
    });
    assert.equal(noHistory.toUpsert.length, 0);
    assert.equal(noHistory.skipped[0]?.reason, "history_missing");

    const otherOrg = planGeoAudits({
      organizationId: ORG_A,
      queries: [query({ organizationId: ORG_B })],
      history: [snapshot()],
    });
    assert.equal(otherOrg.toUpsert.length, 0);
    assert.equal(otherOrg.skipped[0]?.reason, "tenant_mismatch");
  });

  it("does not fetch, scrape, ask an AI system, or create a Next step", () => {
    assert.equal(configuredGeoProvider(), "none");
    assert.equal(geoLookupEnabled(), false);
    assert.equal(
      requestGeoLookup({ organizationId: ORG_A, query: "Who should I hire?" }).status,
      "off",
    );

    const helper = readFileSync(join(process.cwd(), "src/lib/geo/audits.ts"), "utf8");
    const persist = readFileSync(
      join(process.cwd(), "src/lib/geo/persist-audits.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/geo-audits-panel.tsx"),
      "utf8",
    );
    const queries = readFileSync(
      join(process.cwd(), "src/lib/phase6/queries.ts"),
      "utf8",
    );
    for (const source of [helper, persist, panel, queries]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(
        source,
        /chatgpt|perplexity|gemini|claude|grok|deepseek/i,
      );
    }
    assert.doesNotMatch(helper, /requestGeoLookup|geoLookupEnabled\(\)/);
    assert.doesNotMatch(persist, /requestGeoLookup|geoLookupEnabled\(\)/);
    assert.match(persist, /eq\(geoQueries\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(geoHistory\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(geoAudits\.organizationId, organizationId\)/);
    assert.match(panel, /will not ask an AI system/);
    assert.match(panel, /treat one answer as truth/);
    assert.match(panel, /Citation gaps are listed first/);
    assert.match(panel, /describeCitationGapsHeading/);
    assert.equal(
      describeCitationGapsHeading(0),
      "Citation gaps from what you already measured",
    );
    assert.equal(
      describeCitationGapsHeading(2),
      "Citation gaps from what you already measured · 2",
    );
    assert.match(queries, /persistGeoAudits/);

    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    assert.doesNotMatch(nextStep, /geoAudit|geo_audit|Review citation gaps/);
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /GeoAuditsPanel/);
    assert.match(seoPage, /Citation gaps are listed first/);
    const seoPersist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-seo-actions.ts"),
      "utf8",
    );
    assert.match(seoPersist, /persistGeoAudits/);
    const catalog = readFileSync(
      join(process.cwd(), "src/lib/modules/catalog.ts"),
      "utf8",
    );
    assert.doesNotMatch(catalog, /ai_visibility/);
  });
});
