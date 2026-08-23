import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  extractWebsitePage,
  isGenericWebsiteLabel,
  sameOriginPageUrls,
  websiteBrainNotes,
  websiteOfferCandidates,
} from "./website-discover";

const html = `
<html>
  <head>
    <title>Harbor Skills | Learn with us</title>
    <meta name="description" content="Hands-on workshops and private sessions." />
    <script>document.write('<h1>Ignore this</h1>')</script>
  </head>
  <body>
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/workshops">Weekend Workshop</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="https://other.example/ads">Ads</a>
        <a href="/brochure.pdf">Brochure</a>
      </nav>
    </header>
    <h1>Welcome</h1>
    <h2>Weekend Workshop</h2>
    <h2>Private Session</h2>
  </body>
</html>
`;

describe("website page discovery", () => {
  it("reads title, description, headings, and menu labels from HTML", () => {
    const page = extractWebsitePage("https://www.example.com/", html);
    assert.equal(page.isHome, true);
    assert.match(page.title, /Harbor Skills/);
    assert.match(page.description, /Hands-on workshops/);
    assert.equal(page.headings.includes("Welcome"), true);
    assert.equal(page.headings.includes("Weekend Workshop"), true);
    assert.equal(page.navLabels.includes("Weekend Workshop"), true);
    assert.equal(page.headings.includes("Ignore this"), false);
  });

  it("follows useful same-origin pages and skips About, Contact, and files", () => {
    const urls = sameOriginPageUrls(html, "https://www.example.com/");
    assert.deepEqual(urls, ["https://www.example.com/workshops"]);
  });

  it("drafts offers from headings and extra pages, not chrome or slogans", () => {
    const home = extractWebsitePage("https://www.example.com/", html);
    const extra = extractWebsitePage(
      "https://www.example.com/workshops",
      `<html><head><title>Weekend Workshop</title><meta name="description" content="A half-day session." /></head><body><h1>Weekend Workshop</h1></body></html>`,
    );
    const candidates = websiteOfferCandidates([home, extra]);
    const names = candidates.map((row) => row.name);
    assert.equal(names.includes("Weekend Workshop"), true);
    assert.equal(names.includes("Private Session"), true);
    assert.equal(names.includes("About"), false);
    assert.equal(names.includes("Contact"), false);
    assert.equal(names.includes("Harbor Skills | Learn with us"), false);
    assert.equal(candidates[0]?.source, "connected_website");
  });

  it("reads named program cards and inner pages, not the homepage slogan", () => {
    const osaHome = extractWebsitePage(
      "https://www.example.com/",
      `<html><head><title>Example Adventures</title><meta name="description" content="Training and trips." /></head>
      <body>
        <nav><a href="/training-programs">Training</a><a href="/about">About</a><a href="/customer">Customer Portal</a></nav>
        <h1>Where training becomes real practice.</h1>
        <h3>Coastal Training</h3>
        <p><a href="/training-programs/coastal-training">Explore Coastal Training</a></p>
        <h3>Certification Pathways</h3>
        <h3>Offshore Passage Training</h3>
      </body></html>`,
    );
    const coastal = extractWebsitePage(
      "https://www.example.com/training-programs/coastal-training",
      `<html><head><title>Example Adventures</title></head><body><h1>Coastal Training</h1></body></html>`,
    );
    const names = websiteOfferCandidates([osaHome, coastal]).map((row) => row.name);
    assert.equal(names.includes("Coastal Training"), true);
    assert.equal(names.includes("Certification Pathways"), true);
    assert.equal(names.includes("Offshore Passage Training"), true);
    assert.equal(names.includes("Where training becomes real practice."), false);
    assert.equal(names.includes("Training"), false);
    assert.equal(names.includes("Customer Portal"), false);
    const followed = sameOriginPageUrls(
      `<a href="/training-programs">Training</a><a href="/about">About</a><a href="/training-programs/coastal-training">Explore Coastal Training</a><a href="/customer">Customer Portal</a>`,
      "https://www.example.com/",
    );
    assert.equal(followed[0], "https://www.example.com/training-programs/coastal-training");
    assert.equal(followed.includes("https://www.example.com/about"), false);
    assert.equal(followed.includes("https://www.example.com/customer"), false);
  });

  it("treats Home, About, and Contact as generic labels", () => {
    assert.equal(isGenericWebsiteLabel("About us"), true);
    assert.equal(isGenericWebsiteLabel("Weekend Workshop"), false);
  });

  it("notes that the connected website was read and not changed", () => {
    const notes = websiteBrainNotes([
      extractWebsitePage("https://www.example.com/", html),
    ]);
    assert.match(notes.join(" "), /did not change/);
    assert.doesNotMatch(notes.join(" ").toLowerCase(), /sailing|boat|seat/);
  });

  it("does not bake sailing or seat language into website discovery", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/growth/website-discover.ts"),
      "utf8",
    );
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
