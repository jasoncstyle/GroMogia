import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { auditConnectedPage, isSafePublicHttpUrl } from "./audit";

const completePage = `<!doctype html>
<html lang="en">
  <head>
    <title>Harbor Workshops | Hands-on classes</title>
    <meta name="description" content="Weekend classes for beginners who want practical skills, not a lecture. Small groups and real practice." />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="canonical" href="https://example.com/" />
    <meta property="og:title" content="Harbor Workshops" />
    <script type="application/ld+json">{"@type":"Organization"}</script>
  </head>
  <body>
    <h1>Where practice becomes skill</h1>
    <img src="/hero.jpg" alt="Students at a bench" />
  </body>
</html>`;

describe("seo page audit", () => {
  it("scores a complete homepage without inventing a site edit", () => {
    const result = auditConnectedPage({
      url: "https://example.com/",
      html: completePage,
      robotsText: "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n",
      sitemapFound: true,
    });
    assert.equal(result.findings.every((item) => item.severity === "ok"), true);
    assert.equal(result.score, 100);
    assert.match(result.summary, /did not change the website/);
  });

  it("fails a missing title and warns about a missing sitemap", () => {
    const result = auditConnectedPage({
      url: "https://example.com/",
      html: "<html><head></head><body><h1>Hi</h1><h1>Again</h1><img src='/a.jpg'></body></html>",
      robotsText: null,
      sitemapFound: false,
    });
    assert.equal(result.findings.some((item) => item.id === "title" && item.severity === "fail"), true);
    assert.equal(result.findings.some((item) => item.id === "sitemap" && item.severity === "warn"), true);
    assert.equal(result.score < 100, true);
  });

  it("rejects private fetch targets", () => {
    assert.equal(Boolean(isSafePublicHttpUrl("https://www.example.com")), true);
    assert.equal(isSafePublicHttpUrl("http://127.0.0.1/"), null);
    assert.equal(isSafePublicHttpUrl("http://192.168.1.8/"), null);
    assert.equal(isSafePublicHttpUrl("file:///etc/passwd"), null);
  });
});
