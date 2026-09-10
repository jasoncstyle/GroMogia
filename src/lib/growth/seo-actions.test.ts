import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  SEO_ACTION_THRESHOLDS,
  SEO_PAGE_IMPROVEMENT,
  SEO_SEARCH_OPPORTUNITY,
  planSeoGrowthActions,
  seoPageExternalId,
  seoSearchExternalId,
  type SeoFindingEvidence,
} from "./seo-actions";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const PAGE_URL = "https://example.com/asa-104";

function finding(
  id: string,
  severity: SeoFindingEvidence["severity"],
  detail = "",
): SeoFindingEvidence {
  return { id, severity, title: id, detail };
}

function auditFindings(overrides: SeoFindingEvidence[] = []) {
  return [
    finding("title", "ok"),
    finding("description", "ok"),
    finding("h1", "ok"),
    ...overrides,
  ];
}

describe("SEO growth actions", () => {
  it("turns meaningful SEO audit findings into one proposed page action", () => {
    const plan = planSeoGrowthActions({
      organizationId: ORG_A,
      audits: [
        {
          url: PAGE_URL,
          findings: [
            finding("title", "fail", "This page has no title tag."),
            finding("description", "fail", "No meta description was found."),
            finding("h1", "warn", "No H1 heading was found."),
          ],
        },
      ],
    });

    assert.equal(plan.toInsert.length, 1);
    const action = plan.toInsert[0];
    assert.equal(action?.organizationId, ORG_A);
    assert.equal(action?.module, "seo");
    assert.equal(action?.actionType, SEO_PAGE_IMPROVEMENT);
    assert.equal(action?.status, "proposed");
    assert.equal(action?.risk, "optimization");
    assert.equal(action?.provider, "seo_audit");
    assert.equal(action?.executedAt, null);
    assert.equal(action?.externalId, seoPageExternalId(PAGE_URL));
    assert.match(action?.description ?? "", /Asa 104 page/);
    assert.match(action?.description ?? "", /missing title/);
    assert.match(action?.description ?? "", /missing meta description/);
    assert.match(action?.description ?? "", /missing primary heading/);
    assert.match(action?.description ?? "", /Update the title, description, and primary heading/);
    assert.match(action?.description ?? "", /will not change the live website/);
  });

  it("does not create a page action from a single weak warning", () => {
    const plan = planSeoGrowthActions({
      organizationId: ORG_A,
      audits: [
        {
          url: PAGE_URL,
          findings: auditFindings([finding("title", "warn", "Title is short.")]),
        },
      ],
    });
    assert.equal(
      plan.toInsert.some((item) => item.actionType === SEO_PAGE_IMPROVEMENT),
      false,
    );
    assert.equal(
      plan.skipped.some((item) => item.reason === "not_meaningful"),
      true,
    );
  });

  it("turns a Search Console striking-distance query into a proposed search action", () => {
    const plan = planSeoGrowthActions({
      organizationId: ORG_A,
      searchConsole: {
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        topQueries: [
          {
            key: "ASA sailing lessons",
            clicks: 18,
            impressions: 1240,
            ctr: 0.0145,
            position: 11.3,
          },
        ],
      },
    });

    assert.equal(plan.toInsert.length, 1);
    const action = plan.toInsert[0];
    assert.equal(action?.actionType, SEO_SEARCH_OPPORTUNITY);
    assert.equal(action?.status, "proposed");
    assert.equal(action?.executedAt, null);
    assert.equal(
      action?.externalId,
      seoSearchExternalId("striking_distance", "ASA sailing lessons"),
    );
    assert.match(action?.description ?? "", /1,240 impressions/);
    assert.match(action?.description ?? "", /11\.3/);
    assert.match(action?.description ?? "", /opportunity worth reviewing/);
    assert.doesNotMatch(action?.description ?? "", /causing low traffic/);
    assert.match(action?.description ?? "", /will not change the live website/);
  });

  it("turns a high-impression page-one query with low CTR into a cautious search action", () => {
    const plan = planSeoGrowthActions({
      organizationId: ORG_A,
      searchConsole: {
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        topQueries: [
          {
            key: "learn to sail",
            clicks: 4,
            impressions: 400,
            ctr: 0.01,
            position: 4.2,
          },
        ],
      },
    });

    assert.equal(plan.toInsert.length, 1);
    assert.equal(
      plan.toInsert[0]?.externalId,
      seoSearchExternalId("low_ctr", "learn to sail"),
    );
    assert.match(plan.toInsert[0]?.description ?? "", /does not automatically mean the title is bad/);
  });

  it("does not create a Search Console action from tiny or noisy evidence", () => {
    const plan = planSeoGrowthActions({
      organizationId: ORG_A,
      searchConsole: {
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        topQueries: [
          {
            key: "tiny query",
            clicks: 0,
            impressions: 2,
            ctr: 0,
            position: 11.1,
          },
          {
            key: "already strong",
            clicks: 80,
            impressions: 400,
            ctr: 0.2,
            position: 2.1,
          },
        ],
      },
    });

    assert.equal(plan.toInsert.length, 0);
    assert.equal(
      plan.skipped.filter((item) => item.reason === "below_threshold").length >= 2,
      true,
    );
    assert.ok(SEO_ACTION_THRESHOLDS.minImpressions > 2);
  });

  it("does not create a duplicate unresolved action on a second observation", () => {
    const first = planSeoGrowthActions({
      organizationId: ORG_A,
      audits: [
        {
          url: PAGE_URL,
          findings: [
            finding("title", "fail"),
            finding("description", "fail"),
          ],
        },
      ],
      searchConsole: {
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        topQueries: [
          {
            key: "ASA sailing lessons",
            clicks: 18,
            impressions: 1240,
            ctr: 0.0145,
            position: 11.3,
          },
        ],
      },
    });
    assert.equal(first.toInsert.length, 2);

    const second = planSeoGrowthActions({
      organizationId: ORG_A,
      audits: [
        {
          url: PAGE_URL,
          findings: [
            finding("title", "fail"),
            finding("description", "fail"),
          ],
        },
      ],
      searchConsole: {
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        topQueries: [
          {
            key: "ASA sailing lessons",
            clicks: 20,
            impressions: 1300,
            ctr: 0.015,
            position: 10.8,
          },
        ],
      },
      existingActions: first.toInsert.map((draft) => ({
        organizationId: draft.organizationId,
        actionType: draft.actionType,
        module: draft.module,
        externalId: draft.externalId,
        status: draft.status,
      })),
    });

    assert.equal(second.toInsert.length, 0);
    assert.equal(
      second.skipped.filter((item) => item.reason === "duplicate").length,
      2,
    );
  });

  it("does not reuse or match another organization's unresolved action", () => {
    const other = planSeoGrowthActions({
      organizationId: ORG_B,
      searchConsole: {
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        topQueries: [
          {
            key: "ASA sailing lessons",
            clicks: 18,
            impressions: 1240,
            ctr: 0.0145,
            position: 11.3,
          },
        ],
      },
    });

    const plan = planSeoGrowthActions({
      organizationId: ORG_A,
      searchConsole: {
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        topQueries: [
          {
            key: "ASA sailing lessons",
            clicks: 18,
            impressions: 1240,
            ctr: 0.0145,
            position: 11.3,
          },
        ],
      },
      existingActions: [
        {
          organizationId: ORG_B,
          actionType: SEO_SEARCH_OPPORTUNITY,
          module: "seo",
          externalId: other.toInsert[0]?.externalId ?? "",
          status: "proposed",
        },
      ],
    });

    assert.equal(plan.toInsert.length, 1);
    assert.equal(plan.toInsert[0]?.organizationId, ORG_A);
    assert.equal(
      plan.skipped.some((item) => item.reason === "tenant_mismatch"),
      true,
    );
  });

  it("proposes review-only actions and never marks them executed", () => {
    const plan = planSeoGrowthActions({
      organizationId: ORG_A,
      audits: [
        {
          url: PAGE_URL,
          findings: [finding("title", "fail"), finding("description", "warn")],
        },
      ],
    });
    for (const draft of plan.toInsert) {
      assert.equal(draft.status, "proposed");
      assert.equal(draft.executedAt, null);
    }

    const planner = readFileSync(join(process.cwd(), "src/lib/growth/seo-actions.ts"), "utf8");
    const persist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-seo-actions.ts"),
      "utf8",
    );
    assert.doesNotMatch(planner, /fetchPublicText/);
    assert.doesNotMatch(persist, /executedAt/);
    assert.doesNotMatch(persist, /update\(websites\)/);
    assert.doesNotMatch(persist, /fetch\(/);
    assert.match(persist, /status: "proposed"/);
    assert.match(persist, /eq\(seoAudits\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(searchConsoleSnapshots\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(growthActions\.organizationId, organizationId\)/);
  });
});
