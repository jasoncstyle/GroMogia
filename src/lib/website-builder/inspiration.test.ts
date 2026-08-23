import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { extractWebsitePage } from "@/lib/growth/website-discover";
import {
  draftInspiredRows,
  inspirationPageFromUrl,
  inspirationQuestions,
  inspirationTopics,
  loadInspirationPages,
  mergeInspirationPages,
  parseInspirationUrls,
} from "./inspiration";

const layoutHtml = `
<html>
  <head><title>Studio Example</title></head>
  <body>
    <h1>Welcome</h1>
    <h2>Weekend Workshop</h2>
    <h2>Private Session</h2>
    <h2>Group Practice</h2>
    <h2>How do I get started?</h2>
    <h2>About</h2>
  </body>
</html>
`;

describe("website builder inspiration", () => {
  it("keeps public https addresses and drops blanks and duplicates", () => {
    const urls = parseInspirationUrls(
      [
        "example.com/one",
        "https://example.com/one",
        "",
        "https://www.example.com/two",
        "not a url",
      ],
      3,
    );
    assert.equal(urls.includes("https://example.com/one"), true);
    assert.equal(urls.includes("https://www.example.com/two"), true);
    assert.equal(urls.length, 2);
  });

  it("accepts wrapped public addresses", () => {
    const urls = parseInspirationUrls(["<https://www.example.com/look>", '"https://www.example.com/words"'], 3);
    assert.deepEqual(urls, [
      "https://www.example.com/look",
      "https://www.example.com/words",
    ]);
  });

  it("reads pasted pages in parallel and keeps site names when a page will not open", async () => {
    const loaded = await loadInspirationPages(
      ["https://www.example.com/open", "https://www.example.com/blocked"],
      async (url) =>
        url.endsWith("/open")
          ? { ok: true, status: 200, body: layoutHtml }
          : { ok: false, status: 403, body: "" },
    );
    assert.equal(loaded.pages.length, 1);
    assert.deepEqual(loaded.failedUrls, ["https://www.example.com/blocked"]);
    const merged = mergeInspirationPages(loaded);
    assert.equal(merged.length, 2);
    assert.equal(merged.some((page) => page.headings.includes("Weekend Workshop")), true);
    assert.equal(merged.some((page) => page.headings.includes("example.com")), true);
  });

  it("drafts topic labels from a site name when the page cannot be read", () => {
    const page = inspirationPageFromUrl("https://www.studio-example.com/work");
    const rows = draftInspiredRows({
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      targetCustomers: "",
      businessType: "workshops",
      layoutPages: [page],
      copyPages: [],
    });
    const json = JSON.stringify(rows);
    assert.match(json, /studio-example.com/);
    assert.equal(rows.some((row) => row.widgets.some((widget) => widget.type === "hero")), true);
  });

  it("uses headings as topics and skips chrome and questions", () => {
    const page = extractWebsitePage("https://www.example.com/", layoutHtml);
    const topics = inspirationTopics([page]);
    assert.equal(topics.includes("Weekend Workshop"), true);
    assert.equal(topics.includes("Private Session"), true);
    assert.equal(topics.includes("About"), false);
    assert.equal(topics.includes("Welcome"), false);
    assert.equal(topics.includes("How do I get started?"), false);
    assert.deepEqual(inspirationQuestions([page]), ["How do I get started?"]);
  });

  it("drafts a GroovGro layout from brand words and topic labels", () => {
    const page = extractWebsitePage("https://www.example.com/", layoutHtml);
    const rows = draftInspiredRows({
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      targetCustomers: "people who want practical skills",
      businessType: "workshops",
      layoutPages: [page],
      copyPages: [],
    });
    const json = JSON.stringify(rows);
    assert.match(json, /Harbor Workshops/);
    assert.match(json, /Hands-on classes for beginners/);
    assert.match(json, /Weekend Workshop/);
    assert.match(json, /your own words/);
    assert.equal(rows.some((row) => row.widgets.some((widget) => widget.type === "hero")), true);
    assert.equal(rows.some((row) => row.widgets.some((widget) => widget.type === "lead")), true);
    assert.equal(rows.some((row) => row.widgets.some((widget) => widget.type === "features")), true);
    assert.equal(rows.some((row) => row.widgets.some((widget) => widget.type === "faq")), true);
    assert.doesNotMatch(json, /<html>|Studio Example/);
  });

  it("does not bake industry-specific words into inspiration helpers", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/website-builder/inspiration.ts"),
      "utf8",
    );
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
