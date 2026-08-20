import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SeoFinding } from "./audit";
import { explainSeoCheck } from "./explain";
import { compareSeoChecks } from "./monitor";

function finding(
  id: string,
  severity: SeoFinding["severity"],
  title = id,
  recommendation = `Update ${title} on the connected website.`,
): SeoFinding {
  return {
    id,
    severity,
    title,
    detail: "",
    recommendation,
  };
}

describe("seo monitor and explain", () => {
  it("explains a first check without inventing a site edit", () => {
    const findings = [
      finding("title", "ok", "Page title"),
      finding("canonical", "warn", "Canonical URL"),
      finding("sitemap", "warn", "Sitemap"),
    ];
    const comparison = compareSeoChecks({ score: 86, findings }, null);
    const explanation = explainSeoCheck({ score: 86, findings, comparison });

    assert.equal(comparison.scoreChange, null);
    assert.match(explanation.headline, /86/);
    assert.match(explanation.paragraphs.join(" "), /Canonical URL and Sitemap/);
    assert.match(explanation.paragraphs.join(" "), /first saved check/);
    assert.match(explanation.paragraphs.join(" "), /did not change the website/);
    assert.equal(
      /buy ads|Search Console|edit the live site for you/i.test(
        explanation.paragraphs.join(" "),
      ),
      false,
    );
  });

  it("reports score and finding changes between checks", () => {
    const previous = [
      finding("title", "fail", "Page title"),
      finding("canonical", "warn", "Canonical URL"),
      finding("sitemap", "ok", "Sitemap"),
    ];
    const current = [
      finding("title", "ok", "Page title"),
      finding("canonical", "warn", "Canonical URL"),
      finding("sitemap", "warn", "Sitemap"),
    ];
    const comparison = compareSeoChecks(
      { score: 86, findings: current },
      { score: 77, findings: previous },
    );
    const explanation = explainSeoCheck({
      score: 86,
      findings: current,
      comparison,
    });

    assert.equal(comparison.scoreChange, 9);
    assert.equal(comparison.improved.some((item) => item.id === "title"), true);
    assert.equal(comparison.worsened.some((item) => item.id === "sitemap"), true);
    assert.match(explanation.paragraphs.join(" "), /up 9/);
    assert.match(explanation.paragraphs.join(" "), /Better since last time: Page title/);
    assert.match(explanation.paragraphs.join(" "), /Worse since last time: Sitemap/);
  });

  it("does not hard-code a sailing business", () => {
    const findings = [finding("title", "ok", "Page title")];
    const explanation = explainSeoCheck({
      score: 100,
      findings,
      comparison: compareSeoChecks({ score: 100, findings }, null),
    });
    assert.equal(
      /ocean sailing|myrtle beach/i.test(explanation.paragraphs.join(" ")),
      false,
    );
  });
});
