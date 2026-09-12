import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  DEFAULT_SCHEMA_TYPE,
  SCHEMA_FACT_SOURCE_PAGE_GROUP,
  describePageStructureGroupHeading,
  describePageStructureHeading,
  isDefaultSchemaType,
  linksToShow,
  planPageStructure,
  schemaFactsToShow,
  schemaTypeForPage,
  sortSchemaFactsForPanel,
} from "./page-structure";

const ORG_A = "11111111-1111-1111-1111-111111111111";

function page(
  overrides: Partial<Parameters<typeof planPageStructure>[0]["pages"][number]> & {
    id: string
    url: string
  },
) {
  return {
    title: "Harbor day trips",
    headings: ["Harbor day trips"],
    pageGroup: "other",
    ...overrides,
  };
}

describe("page structure from stored pages", () => {
  it("suggests a link when one read page mentions another page title", () => {
    const plan = planPageStructure({
      organizationId: ORG_A,
      pages: [
        page({
          id: "page-home",
          url: "https://example.com/",
          title: "Harbor day trips and beginner classes",
          pageGroup: "home",
        }),
        page({
          id: "page-class",
          url: "https://example.com/beginner-classes",
          title: "Beginner classes",
          headings: ["What to bring"],
          pageGroup: "program",
        }),
      ],
    });

    assert.equal(plan.links.length, 1);
    assert.equal(plan.links[0]?.organizationId, ORG_A);
    assert.equal(plan.links[0]?.fromPageId, "page-home");
    assert.equal(plan.links[0]?.toPageId, "page-class");
    assert.equal(plan.links[0]?.toUrl, "https://example.com/beginner-classes");
    assert.match(plan.links[0]?.reason ?? "", /will not add a link/);
    assert.equal(linksToShow(plan.links).length, 1);
  });

  it("does not invent URLs, self-links, or legal destinations", () => {
    const plan = planPageStructure({
      organizationId: ORG_A,
      pages: [
        page({
          id: "page-home",
          url: "https://example.com/",
          title: "Harbor day trips privacy policy",
          pageGroup: "home",
        }),
        page({
          id: "page-home-dup",
          url: "https://example.com/",
          urlKey: "https://example.com/",
          title: "Harbor day trips",
          pageGroup: "other",
        }),
        page({
          id: "page-legal",
          url: "https://example.com/privacy",
          title: "Privacy policy",
          headings: ["Privacy policy"],
          pageGroup: "legal",
        }),
      ],
    });

    assert.equal(plan.links.length, 0);
    assert.equal(
      plan.links.some((row) => row.toPageId === "page-legal"),
      false,
    );
    assert.equal(
      plan.links.some((row) => row.fromPageId === row.toPageId),
      false,
    );
  });

  it("estimates schema types from the stored page group", () => {
    assert.equal(
      schemaTypeForPage({
        id: "home",
        url: "https://example.com/",
        pageGroup: "home",
      }),
      "WebSite",
    );
    assert.equal(
      schemaTypeForPage({
        id: "event",
        url: "https://example.com/events/harbor-day",
        pageGroup: "event",
      }),
      "Event",
    );
    assert.equal(
      schemaTypeForPage({
        id: "program",
        url: "https://example.com/classes",
        pageGroup: "program",
      }),
      "Service",
    );
    assert.equal(
      schemaTypeForPage({
        id: "calendar",
        url: "https://example.com/calendar",
        pageGroup: "calendar",
      }),
      "CollectionPage",
    );
    assert.equal(
      schemaTypeForPage({
        id: "contact",
        url: "https://example.com/contact",
        pageGroup: "legal",
      }),
      "ContactPage",
    );
    assert.equal(
      schemaTypeForPage({
        id: "about",
        url: "https://example.com/about",
        pageGroup: "legal",
      }),
      "AboutPage",
    );
    assert.equal(
      schemaTypeForPage({
        id: "privacy",
        url: "https://example.com/privacy",
        pageGroup: "legal",
      }),
      DEFAULT_SCHEMA_TYPE,
    );
    assert.equal(
      schemaTypeForPage({
        id: "other",
        url: "https://example.com/team",
        pageGroup: "other",
      }),
      DEFAULT_SCHEMA_TYPE,
    );
    assert.equal(
      schemaTypeForPage({
        id: "external",
        url: "https://other.example/page",
        pageGroup: "third_party",
      }),
      null,
    );
    assert.equal(isDefaultSchemaType("WebPage"), true);
    assert.equal(isDefaultSchemaType("Event"), false);
  });

  it("skips unread pages and does not invent schema for another site", () => {
    const unread = planPageStructure({
      organizationId: ORG_A,
      pages: [
        page({
          id: "page-empty",
          url: "https://example.com/",
          title: "",
          headings: [],
          pageGroup: "home",
        }),
      ],
    });
    assert.equal(unread.links.length, 0);
    assert.equal(unread.schemaFacts.length, 0);
    assert.equal(unread.skipped[0]?.reason, "pages_not_read");

    const onePage = planPageStructure({
      organizationId: ORG_A,
      pages: [
        page({
          id: "page-home",
          url: "https://example.com/",
          title: "Harbor day trips",
          pageGroup: "home",
        }),
      ],
    });
    assert.equal(onePage.links.length, 0);
    assert.equal(onePage.skipped[0]?.reason, "not_enough_pages");
    assert.equal(onePage.schemaFacts[0]?.schemaType, "WebSite");
    assert.match(onePage.schemaFacts[0]?.why ?? "", /will not add schema/);

    const missingOrg = planPageStructure({
      organizationId: "",
      pages: [
        page({
          id: "page-home",
          url: "https://example.com/",
          title: "Harbor day trips",
          pageGroup: "home",
        }),
      ],
    });
    assert.equal(missingOrg.links.length, 0);
    assert.equal(missingOrg.schemaFacts.length, 0);
    assert.equal(missingOrg.skipped[0]?.reason, "tenant_mismatch");
  });

  it("does not fetch, emit JSON-LD, write the live site, or create a Next step", () => {
    const helper = readFileSync(
      join(process.cwd(), "src/lib/growth/page-structure.ts"),
      "utf8",
    );
    const persist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-page-structure.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/page-structure-panel.tsx"),
      "utf8",
    );
    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    for (const source of [helper, persist, panel]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(source, /application\/ld\+json|@context|<script/i);
      assert.doesNotMatch(source, /generateText/);
    }
    assert.match(persist, /eq\(websiteDiscoveredPages\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(internalLinkSuggestions\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(pageSchemaFacts\.organizationId, organizationId\)/);
    assert.match(panel, /will not add links or schema/);
    assert.match(panel, /listed first/);
    assert.match(helper, /sortSchemaFactsForPanel/);
    assert.deepEqual(
      sortSchemaFactsForPanel([
        { schemaType: DEFAULT_SCHEMA_TYPE, pageUrl: "https://example.com/a" },
        { schemaType: "Event", pageUrl: "https://example.com/z" },
        { schemaType: DEFAULT_SCHEMA_TYPE, pageUrl: "https://example.com/b" },
      ]).map((row) => row.schemaType),
      ["Event", DEFAULT_SCHEMA_TYPE, DEFAULT_SCHEMA_TYPE],
    );
    assert.equal(
      schemaFactsToShow([
        {
          organizationId: ORG_A,
          pageId: "a",
          pageUrl: "https://example.com/a",
          pageTitle: "Harbor day trips",
          schemaType: DEFAULT_SCHEMA_TYPE,
          why: "Estimated from the stored page group.",
          source: SCHEMA_FACT_SOURCE_PAGE_GROUP,
        },
        {
          organizationId: ORG_A,
          pageId: "z",
          pageUrl: "https://example.com/z",
          pageTitle: "Weekend beginner class",
          schemaType: "Event",
          why: "Estimated from the stored page group.",
          source: SCHEMA_FACT_SOURCE_PAGE_GROUP,
        },
      ])[0]?.schemaType,
      "Event",
    );
    assert.match(panel, /describePageStructureHeading/);
    assert.match(panel, /describePageStructureGroupHeading/);
    assert.equal(describePageStructureGroupHeading("links", 2), "Suggested links · 2");
    assert.equal(
      describePageStructureGroupHeading("schema", 1),
      "Estimated schema types · 1",
    );
    assert.equal(
      describePageStructureHeading(0, 0),
      "Links and schema facts from pages GroovGro already read",
    );
    assert.equal(
      describePageStructureHeading(2, 1),
      "Links and schema facts from pages GroovGro already read · 2 suggested links · 1 schema fact",
    );
    assert.doesNotMatch(nextStep, /internalLink|page_schema|Add schema|internal link/);
    const seoPersist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-seo-actions.ts"),
      "utf8",
    );
    assert.match(seoPersist, /persistPageStructure/);
  });
});
