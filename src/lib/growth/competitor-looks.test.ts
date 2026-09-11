import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  competitorHost,
  lookFromHtml,
  lookFromPublicContent,
  normalizeCompetitorUrl,
  planCompeteNote,
  planCompetitorLook,
  planCompetitorSite,
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
    assert.match(planned.marketingGuess, /book or schedule/);
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
    assert.equal(competitorSearchEnabled(), false);
    assert.equal(configuredCompetitorSearchProvider(), "none");
    const refused = requestCompetitorSearch({
      organizationId: ORG_A,
      query: "weekend beginner class",
    });
    assert.equal(refused.status, "off");
    assert.match(refused.reason, /will not scrape Google/);
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
    assert.match(action, /pageText/);
    assert.match(action, /explainPublicFetchFailure/);
    assert.match(reader, /r\.jina\.ai/);
    assert.match(reader, /owner-named public page/);
    assert.doesNotMatch(reader, /google\.com\/search/);
    assert.match(panel, /will not scrape Google/);
    assert.match(panel, /Read this website/);
    assert.match(panel, /paste the public page/);
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
    const observe = readFileSync(
      join(process.cwd(), "src/lib/intelligence/observe.ts"),
      "utf8",
    );
    assert.match(observe, /competitorSiteCount/);
    assert.doesNotMatch(observe, /coordinateNextStep/);
  });
});
