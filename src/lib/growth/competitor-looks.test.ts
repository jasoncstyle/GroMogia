import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  competitorHost,
  competitorPageGapsNeedingBrief,
  competitorPageGapsWithBrief,
  describeCompetitorPageGapGroupHeading,
  describeCompetitorPageGapsHeading,
  shouldGroupCompetitorPageGaps,
  sortCompetitorPageGapsForPanel,
  lookFromHtml,
  lookFromPublicContent,
  normalizeCompetitorUrl,
  planCompeteNote,
  ownerCompetitorSearchHref,
  planCompetitorCompare,
  planCompetitorLook,
  planCompetitorPageGaps,
  planCompetitorSite,
  proposeCompetitorInnerPages,
  proposeCompetitorSearches,
} from "./competitor-looks";
import {
  competitorSearchEnabled,
  configuredCompetitorSearchProvider,
  requestCompetitorSearch,
} from "./competitor-search";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const HTML = `
  <html>
    <head>
      <title>Harbor Skills | Learn on the water</title>
      <meta name="description" content="Weekend skills and coastal trips." />
    </head>
    <body>
      <header><nav><a href="/book">Book a date</a><a href="/blog">Guides</a></nav></header>
      <h1>Weekend beginner class</h1>
      <h2>Packages from $199</h2>
    </body>
  </html>
`;

describe("competitor looks from owner-saved URLs", () => {
  it("saves a public competitor website the owner named", () => {
    const draft = planCompetitorSite({
      organizationId: ORG_A,
      name: "  Harbor Skills  ",
      url: "harborskills.example",
      note: "  They take our people.  ",
    });
    assert.equal(draft.organizationId, ORG_A);
    assert.equal(draft.name, "Harbor Skills");
    assert.equal(draft.url, "https://harborskills.example/");
    assert.equal(draft.host, "harborskills.example");
    assert.equal(draft.note, "They take our people.");
    assert.equal(draft.source, "owner");
    assert.equal(draft.status, "saved");
    assert.equal(
      competitorHost(normalizeCompetitorUrl("https://www.HarborSkills.example/path")!),
      "harborskills.example",
    );
  });

  it("refuses this business, search engines, and a missing organization", () => {
    assert.throws(
      () => planCompetitorSite({ organizationId: "", url: "https://other.example" }),
      /Missing organization/,
    );
    assert.throws(
      () =>
        planCompetitorSite({
          organizationId: ORG_A,
          url: "https://ours.example",
          ownHost: "ours.example",
        }),
      /own website/,
    );
    assert.throws(
      () => planCompetitorSite({ organizationId: ORG_A, url: "https://www.google.com/search" }),
      /will not search Google/,
    );
    assert.equal(normalizeCompetitorUrl("https://localhost/"), null);
  });

  it("reads a named homepage and writes a compete look", () => {
    const look = lookFromHtml("https://harborskills.example/", HTML);
    assert.match(look.title, /Harbor Skills/);
    assert.match(look.description, /Weekend skills/);
    assert.equal(look.headings[0], "Weekend beginner class");
    const planned = planCompetitorLook({
      name: "Harbor Skills",
      url: "https://harborskills.example/",
      html: HTML,
      ourOffers: ["  Private coaching  "],
      ourDifference: ["Smaller groups"],
    });
    assert.match(planned.modelGuess, /Weekend beginner class/);
    assert.match(planned.marketingGuess, /book, join, or apply/);
    assert.match(planned.competeNote, /Private coaching/);
    assert.match(planned.competeNote, /not a reason to copy their words/);
    const fromText = lookFromPublicContent(
      "https://harborskills.example/",
      [
        "Title: Harbor Skills",
        "",
        "## Weekend beginner class",
        "Book a date for a coastal trip.",
      ].join("\n"),
    );
    assert.equal(fromText.title, "Harbor Skills");
    assert.equal(fromText.headings[0], "Weekend beginner class");
    assert.match(fromText.description, /Book a date/);
    const deeper = planCompetitorLook({
      name: "Harbor Skills",
      url: "https://harborskills.example/",
      html: [
        "Title: Harbor Skills is a coastal training school",
        "",
        "## Hands-on beginner expeditions",
        "We take up to five students aboard for a liveaboard training course.",
        "Book a date. [Courses](/courses) [About](/about)",
      ].join("\n"),
      extraPages: [
        {
          url: "https://harborskills.example/courses",
          html: "## Private coaching\nSmall group coastal trips. Contact us.",
        },
      ],
      ourOffers: ["Intro Workshop"],
    });
    assert.match(deeper.modelGuess, /training or a course/);
    assert.match(deeper.modelGuess, /2 public pages/);
    assert.match(deeper.marketingGuess, /course, class, or expedition/);
    assert.doesNotMatch(deeper.marketingGuess, /did not show a clear marketing move/);
    assert.match(deeper.competeNote, /Intro Workshop/);
    assert.deepEqual(
      proposeCompetitorInnerPages({
        homeUrl: "https://harborskills.example/",
        content: "Read [Courses](/courses) and [https://www.google.com/search](https://www.google.com/search).",
      }),
      ["https://harborskills.example/courses"],
    );
    assert.equal(
      planCompeteNote({
        name: "Harbor Skills",
        look,
      }).includes("name your offer"),
      true,
    );
  });

  it("proposes later searches from stored terms and keeps search discovery off", () => {
    const hints = proposeCompetitorSearches({
      industry: "  coastal training  ",
      storedQueries: ["weekend beginner class", "coastal training", ""],
    });
    assert.equal(hints[0]?.query, "coastal training");
    assert.equal(hints[1]?.query, "weekend beginner class");
    assert.equal(
      hints[0]?.ownerSearchHref,
      ownerCompetitorSearchHref("coastal training"),
    );
    assert.match(hints[0]?.ownerSearchHref ?? "", /google\.com\/search\?q=/);
    assert.equal(ownerCompetitorSearchHref("   "), null);
    assert.equal(proposeCompetitorSearches({}).length, 0);
    assert.equal(competitorSearchEnabled(), false);
    const found = planCompetitorSite({
      organizationId: ORG_A,
      url: "https://other.example",
      foundFrom: "  coastal training  ",
    });
    assert.equal(found.source, "owner_search");
    assert.match(found.note, /coastal training/);
    assert.equal(configuredCompetitorSearchProvider(), "none");
    const refused = requestCompetitorSearch({
      organizationId: ORG_A,
      query: "weekend beginner class",
    });
    assert.equal(refused.status, "off");
    assert.match(refused.reason, /will not scrape Google/);
  });

  it("compares saved looks to what this business sells", () => {
    const looked = planCompetitorLook({
      name: "Harbor Skills",
      url: "https://harborskills.example/",
      html: HTML,
      ourOffers: ["Private coaching"],
    });
    const one = planCompetitorCompare({
      sites: [
        {
          name: "Harbor Skills",
          status: "looked",
          title: looked.title,
          headings: looked.headings,
          modelGuess: looked.modelGuess,
          marketingGuess: looked.marketingGuess,
          competeNote: looked.competeNote,
        },
      ],
      ourOffers: ["  Private coaching  "],
    });
    assert.ok(one);
    assert.deepEqual(one.names, ["Harbor Skills"]);
    assert.equal(one.ourLead, "Private coaching");
    assert.match(one.note, /Harbor Skills is a site you named/);
    assert.match(one.note, /Private coaching/);
    assert.match(one.note, /not a reason to copy their words/);
    assert.equal(one.source, "stored_looks");

    const two = planCompetitorCompare({
      sites: [
        {
          name: "Harbor Skills",
          status: "looked",
          title: "Harbor Skills",
          headings: ["Weekend beginner class"],
          modelGuess: "This public site sells training or a course. It leads with “Weekend beginner class”.",
          marketingGuess: "It asks people to book, join, or apply. It shows a price or package.",
          competeNote: "saved look",
        },
        {
          name: "Coastal Practice",
          status: "looked",
          title: "Coastal Practice",
          headings: ["Small group trips"],
          modelGuess: "This public site sells training or a course and a trip people join.",
          marketingGuess: "It asks people to book, join, or apply. It shows guides or news.",
          competeNote: "saved look",
        },
        {
          name: "Not read yet",
          status: "saved",
          title: "",
          headings: [],
          modelGuess: "",
          marketingGuess: "",
          competeNote: "",
        },
      ],
      ourDifference: ["Smaller groups"],
    });
    assert.ok(two);
    assert.equal(two.names.includes("Not read yet"), false);
    assert.match(two.note, /2 sites you named/);
    assert.match(two.note, /training or a course/);
    assert.match(two.note, /ask people to book/);
    assert.match(two.note, /Smaller groups/);
    assert.equal(planCompetitorCompare({ sites: [] }), null);
  });

  it("names competitor page topics missing from pages already read", () => {
    const looked = {
      name: "Harbor Skills",
      status: "looked" as const,
      headings: ["Weekend beginner class", "About"],
      navLabels: ["Book a date", "Guides"],
      modelGuess: "looked",
      competeNote: "looked",
    };
    assert.deepEqual(
      planCompetitorPageGaps({
        sites: [looked],
        pages: [],
      }),
      [],
    );
    const gaps = planCompetitorPageGaps({
      sites: [
        looked,
        {
          name: "Coastal Practice",
          status: "looked",
          headings: ["Weekend beginner class"],
          navLabels: ["Home"],
          modelGuess: "looked",
          competeNote: "looked",
        },
      ],
      pages: [
        {
          url: "https://ours.example/",
          title: "Harbor Home",
          headings: ["Welcome"],
        },
      ],
    });
    assert.equal(
      gaps.some((gap) => gap.label === "Weekend beginner class"),
      true,
    );
    assert.equal(
      gaps.some((gap) => /About|Book a date|Home/.test(gap.label)),
      false,
    );
    assert.match(
      gaps.find((gap) => gap.label === "Weekend beginner class")?.why ?? "",
      /Harbor Skills and Coastal Practice/,
    );
    assert.match(
      gaps.find((gap) => gap.label === "Weekend beginner class")?.why ?? "",
      /not a reason to copy their words or create a page/,
    );
    assert.deepEqual(
      planCompetitorPageGaps({
        sites: [looked],
        pages: [
          {
            url: "https://ours.example/class",
            title: "Weekend beginner class",
            headings: ["Weekend beginner class"],
          },
        ],
      }).filter((gap) => gap.label === "Weekend beginner class"),
      [],
    );
  });

  it("does not scrape Google, copy a site, or reorder Next step", () => {
    const helper = readFileSync(
      join(process.cwd(), "src/lib/growth/competitor-looks.ts"),
      "utf8",
    );
    const search = readFileSync(
      join(process.cwd(), "src/lib/growth/competitor-search.ts"),
      "utf8",
    );
    const reader = readFileSync(
      join(process.cwd(), "src/lib/growth/page-reader.ts"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/competitor-sites.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/competitor-sites-panel.tsx"),
      "utf8",
    );
    assert.match(helper, /owner-saved public URLs/);
    assert.match(search, /competitorSearchEnabled/);
    assert.equal(competitorSearchEnabled(), false);
    assert.match(action, /session\.organizationId/);
    assert.match(action, /eq\(competitorSites\.organizationId, session\.organizationId\)/);
    assert.match(action, /fetchNamedPublicPage/);
    assert.match(action, /proposeCompetitorInnerPages/);
    assert.match(action, /extraPages/);
    assert.match(action, /pageText/);
    assert.match(action, /foundFrom/);
    assert.match(action, /explainPublicFetchFailure/);
    assert.match(reader, /r\.jina\.ai/);
    assert.match(reader, /owner-named public page/);
    assert.doesNotMatch(reader, /google\.com\/search/);
    assert.match(panel, /will not scrape Google/);
    assert.match(panel, /Read this website/);
    assert.match(panel, /paste the public page/);
    assert.match(panel, /How they sell/);
    assert.match(panel, /How they market/);
    assert.match(panel, /Open this search/);
    assert.match(panel, /Save this competitor/);
    assert.match(panel, /You\s+run the search/);
    assert.match(panel, /ownerSearchHref/);
    assert.match(panel, /How these sites compare/);
    assert.match(panel, /describeCompetitorPageGapsHeading/);
    assert.match(helper, /Pages they show that GroovGro has not read/);
    assert.equal(
      describeCompetitorPageGapsHeading(0),
      "Pages they show that GroovGro has not read",
    );
    assert.equal(
      describeCompetitorPageGapsHeading(2, true),
      "Pages they show that GroovGro has not read · 2",
    );
    assert.equal(
      describeCompetitorPageGapsHeading(2, true, 1),
      "Pages they show that GroovGro has not read · 2 · 1 already has a brief",
    );
    assert.equal(
      describeCompetitorPageGapsHeading(2, true, 2),
      "Pages they show that GroovGro has not read · 2 · all have a brief",
    );
    assert.match(panel, /briefedPageGapCount/);
    assert.match(panel, /sortCompetitorPageGapsForPanel/);
    assert.match(panel, /describeCompetitorPageGapGroupHeading/);
    assert.equal(
      describeCompetitorPageGapGroupHeading("need", 2),
      "Still need a brief · 2",
    );
    assert.equal(
      describeCompetitorPageGapGroupHeading("have", 1),
      "Already have a brief · 1",
    );
    assert.equal(
      shouldGroupCompetitorPageGaps(
        [{ label: "Private coaching" }, { label: "Weekend beginner class" }],
        (label) => label === "Private coaching",
      ),
      true,
    );
    assert.deepEqual(
      competitorPageGapsNeedingBrief(
        [{ label: "Private coaching" }, { label: "Weekend beginner class" }],
        (label) => label === "Private coaching",
      ).map((row) => row.label),
      ["Weekend beginner class"],
    );
    assert.deepEqual(
      competitorPageGapsWithBrief(
        [{ label: "Private coaching" }, { label: "Weekend beginner class" }],
        (label) => label === "Private coaching",
      ).map((row) => row.label),
      ["Private coaching"],
    );
    assert.deepEqual(
      sortCompetitorPageGapsForPanel(
        [{ label: "Private coaching" }, { label: "Weekend beginner class" }],
        (label) => label === "Private coaching",
      ).map((row) => row.label),
      ["Weekend beginner class", "Private coaching"],
    );
    assert.match(panel, /Save a brief for this topic/);
    assert.match(panel, /listed first/);
    assert.match(panel, /Moves still planned/);
    assert.match(helper, /planCompetitorCompare/);
    assert.match(helper, /planCompetitorPageGaps/);
    assert.match(helper, /stored_looks/);
    assert.match(helper, /google\.com\/search/);
    assert.doesNotMatch(action, /google\.com\/search/);
    assert.doesNotMatch(action, /fetch\(.*search/);
    for (const source of [helper, search, panel]) {
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(source, /serpApi|dataforseo|googleusercontent/i);
    }
    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    assert.doesNotMatch(
      nextStep,
      /competitorSite|competitor_site|How we might compete/,
    );
    assert.match(
      nextStep,
      /drafts \?\? ownerWork \?\? checkChanged \?\? reviewSite \?\? activate \?\? draftPlan \?\? approvePlan \?\? proposeActions \?\? waitingApprove \?\? learning/,
    );
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /<CompetitorSitesPanel/);
    assert.match(seoPage, /sites=\{data\.competitorSites\}/);
    assert.match(seoPage, /compare=\{data\.competitorCompare\}/);
    assert.match(seoPage, /pageGaps=\{data\.competitorPageGaps\}/);
    assert.match(seoPage, /open a suggested search yourself/);
    assert.match(seoPage, /compare those looks to what you sell/);
    assert.match(seoPage, /topics those sites show/);
    assert.match(seoPage, /save a brief for one of those topics/);
    assert.match(seoPage, /How we might compete names saved sites/);
    assert.match(seoPage, /Planned compete moves are listed first/);
    const observe = readFileSync(
      join(process.cwd(), "src/lib/intelligence/observe.ts"),
      "utf8",
    );
    assert.match(observe, /competitorSiteCount/);
    assert.match(observe, /Run a search to find another competitor/);
    assert.match(observe, /How saved competitor websites compare/);
    assert.match(observe, /competitorPageGapCount/);
    assert.match(observe, /Competitor page topics GroovGro has not read/);
    assert.match(observe, /Save a brief for a competitor page topic/);
    assert.match(observe, /will not search Google/);
    assert.doesNotMatch(observe, /coordinateNextStep/);
  });
});
