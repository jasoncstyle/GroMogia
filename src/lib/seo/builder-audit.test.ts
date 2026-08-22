import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { auditBuilderPage, snapshotBuilderPage } from "./builder-audit";

describe("seo GroovGro page audit", () => {
  it("scores a published GroovGro page without touching the connected site", () => {
    const snapshot = snapshotBuilderPage({
      pageLabel: "Home",
      title: "Harbor Workshops | Hands-on classes",
      metaDescription:
        "Weekend classes for beginners who want practical skills, not a lecture.",
      published: true,
      publicUrl: "https://www.groovgro.com/w/harbor",
      widgets: [
        {
          type: "hero",
          content: { heading: "Learn by making", headingLevel: "h1" },
        },
        {
          type: "image",
          content: { imageUrl: "https://images.example.com/a.jpg", imageAlt: "A bench" },
        },
      ],
    });
    const result = auditBuilderPage(snapshot);
    assert.equal(result.findings.every((item) => item.severity === "ok"), true);
    assert.equal(result.score, 100);
    assert.equal(result.findings.some((item) => item.id === "robots-file"), false);
    assert.equal(result.findings.some((item) => item.id === "sitemap"), false);
    assert.match(result.summary, /did not change the connected website/);
    assert.equal(/ocean sailing|adtriox/i.test(JSON.stringify(result)), false);
  });

  it("warns when a GroovGro page is still a draft and has extra Heading 1s", () => {
    const result = auditBuilderPage(
      snapshotBuilderPage({
        pageLabel: "About",
        title: "About",
        metaDescription: "",
        published: false,
        publicUrl: "https://www.groovgro.com/w/harbor/about",
        widgets: [
          { type: "hero", content: { heading: "Who we are" } },
          { type: "text", content: { heading: "12+", headingLevel: "h1" } },
          { type: "image", content: { imageUrl: "https://images.example.com/a.jpg", imageAlt: "" } },
        ],
      }),
    );
    assert.equal(result.findings.some((item) => item.id === "description" && item.severity === "fail"), true);
    assert.equal(result.findings.some((item) => item.id === "live" && item.severity === "warn"), true);
    assert.equal(result.findings.some((item) => item.id === "h1" && item.severity === "warn"), true);
    assert.equal(result.findings.some((item) => item.id === "alt" && item.severity === "warn"), true);
    assert.match(JSON.stringify(result), /Publish About/);
  });
});
