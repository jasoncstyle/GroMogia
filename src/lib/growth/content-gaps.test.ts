import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  CONTENT_GAP_STATUS_COVERED,
  CONTENT_GAP_STATUS_GAP,
  describeContentGapsHeading,
  sortContentGapsForPanel,
  gapsToShow,
  pageCoversQuery,
  planContentGaps,
  queryTokens,
} from "./content-gaps";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

function keyword(
  overrides: Partial<Parameters<typeof planContentGaps>[0]["keywords"][number]> = {},
) {
  return {
    organizationId: ORG_A,
    query: "weekend beginner class",
    queryKey: "weekend beginner class",
    opportunityLabel: "review" as const,
    opportunityScore: 70,
    impressions: 400,
    ...overrides,
  };
}

describe("content gap detection from stored pages", () => {
  it("marks a worth-a-look query as a gap when no read page mentions it", () => {
    const plan = planContentGaps({
      organizationId: ORG_A,
      keywords: [keyword()],
      pages: [
        {
          url: "https://example.com/",
          title: "Harbor day trips",
          description: "Book a day on the water.",
          headings: ["Harbor day trips"],
        },
      ],
    });

    assert.equal(plan.toUpsert.length, 1);
    assert.equal(plan.toUpsert[0]?.status, CONTENT_GAP_STATUS_GAP);
    assert.equal(plan.toUpsert[0]?.organizationId, ORG_A);
    assert.equal(plan.toUpsert[0]?.queryKey, "weekend beginner class");
    assert.match(plan.toUpsert[0]?.why ?? "", /did not find/);
    assert.match(plan.toUpsert[0]?.why ?? "", /not a brief or a new page/);
    assert.equal(gapsToShow(plan.toUpsert).length, 1);
  });

  it("covers a query when a read page already mentions those words", () => {
    const plan = planContentGaps({
      organizationId: ORG_A,
      keywords: [keyword()],
      pages: [
        {
          url: "https://example.com/weekend-beginner-class",
          title: "Weekend beginner class",
          headings: ["What to bring"],
        },
      ],
    });

    assert.equal(plan.toUpsert[0]?.status, CONTENT_GAP_STATUS_COVERED);
    assert.equal(gapsToShow(plan.toUpsert).length, 0);
    assert.equal(
      pageCoversQuery(
        {
          url: "https://example.com/classes",
          title: "Weekend beginner class dates",
          headings: [],
        },
        "weekend beginner class",
      ),
      true,
    );
  });

  it("does not invent gaps from tiny queries or unread pages", () => {
    const unread = planContentGaps({
      organizationId: ORG_A,
      keywords: [keyword()],
      pages: [{ url: "https://example.com/", title: "", headings: [] }],
    });
    assert.equal(unread.toUpsert.length, 0);
    assert.equal(unread.skipped[0]?.reason, "pages_not_read");

    const tiny = planContentGaps({
      organizationId: ORG_A,
      keywords: [
        keyword({
          query: "boat events",
          queryKey: "boat events",
          opportunityLabel: "none",
          opportunityScore: 8,
          impressions: 2,
        }),
      ],
      pages: [
        {
          url: "https://example.com/",
          title: "Harbor day trips",
          headings: ["Harbor day trips"],
        },
      ],
    });
    assert.equal(tiny.toUpsert.length, 0);
    assert.equal(tiny.skipped[0]?.reason, "not_enough_query_evidence");

    const otherOrg = planContentGaps({
      organizationId: ORG_A,
      keywords: [keyword({ organizationId: ORG_B })],
      pages: [
        {
          url: "https://example.com/",
          title: "Harbor day trips",
          headings: ["Harbor day trips"],
        },
      ],
    });
    assert.equal(otherOrg.toUpsert.length, 0);
  });

  it("ignores stopwords so near-me queries can still match a page", () => {
    assert.deepEqual(queryTokens("sailing events near me"), ["sailing", "events"]);
    assert.equal(
      pageCoversQuery(
        {
          url: "https://example.com/events",
          title: "Sailing events this season",
          headings: ["Calendar"],
        },
        "sailing events near me",
      ),
      true,
    );
  });

  it("does not fetch, scrape, write a brief, or create a Next step", () => {
    const helper = readFileSync(join(process.cwd(), "src/lib/growth/content-gaps.ts"), "utf8");
    const persist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-content-gaps.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/content-gaps-panel.tsx"),
      "utf8",
    );
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    for (const source of [helper, persist, panel]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
    }
    assert.match(persist, /eq\(websiteDiscoveredPages\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(contentGaps\.organizationId, organizationId\)/);
    assert.match(panel, /did not invent topics/);
    assert.match(panel, /Save a brief for this query/);
    assert.match(panel, /createContentBrief/);
    assert.match(panel, /content_gap/);
    assert.match(panel, /Already saved on the planner/);
    assert.match(seoPage, /briefs=\{data\.contentBriefs\}/);
    assert.match(panel, /describeContentGapsHeading/);
    assert.equal(
      describeContentGapsHeading(0),
      "Queries with no matching page GroovGro has read",
    );
    assert.equal(
      describeContentGapsHeading(3),
      "Queries with no matching page GroovGro has read · 3",
    );
    assert.equal(
      describeContentGapsHeading(3, 1),
      "Queries with no matching page GroovGro has read · 3 · 1 already has a brief",
    );
    assert.equal(
      describeContentGapsHeading(3, 3),
      "Queries with no matching page GroovGro has read · 3 · all have a brief",
    );
    assert.match(panel, /describeContentGapsHeading\(gaps.length, briefedCount\)/);
    assert.match(panel, /sortContentGapsForPanel/);
    assert.deepEqual(
      sortContentGapsForPanel(
        [{ query: "Private coaching" }, { query: "Weekend beginner class" }],
        (query) => query === "Private coaching",
      ).map((row) => row.query),
      ["Weekend beginner class", "Private coaching"],
    );
    assert.doesNotMatch(nextStep, /contentGap|content_gap|Write a brief|Save a brief for this query/);
    const seoPersist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-seo-actions.ts"),
      "utf8",
    );
    assert.match(seoPersist, /persistContentGaps/);
  });
});
