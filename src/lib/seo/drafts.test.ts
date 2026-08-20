import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSeoChangeDrafts } from "./drafts";
import type { SeoFinding } from "./audit";

function finding(
  id: string,
  severity: SeoFinding["severity"] = "warn",
): SeoFinding {
  return {
    id,
    severity,
    title: id,
    detail: "",
    recommendation: "",
  };
}

describe("seo change drafts", () => {
  it("skips findings that already look good", () => {
    const drafts = buildSeoChangeDrafts(
      [finding("canonical", "ok"), finding("sitemap", "warn")],
      {
        pageUrl: "https://www.example.com/",
        businessName: "Harbor Workshops",
        description: "Hands-on classes for beginners.",
        tone: "warm and practical",
        doSay: "what you will learn",
        dontSay: "guaranteed results",
      },
    );
    assert.equal(drafts.some((draft) => draft.findingId === "canonical"), false);
    assert.equal(drafts.some((draft) => draft.findingId === "sitemap"), true);
  });

  it("drafts a canonical tag and does not apply it to the live site", () => {
    const [draft] = buildSeoChangeDrafts([finding("canonical")], {
      pageUrl: "https://www.example.com/",
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      tone: "warm",
      doSay: "",
      dontSay: "",
    });
    assert.match(draft.proposedChange, /rel="canonical"/);
    assert.match(draft.proposedChange, /https:\/\/www\.example\.com\//);
    assert.match(draft.howToApply, /will not update the live site/);
  });

  it("keeps robots.txt from blocking the whole site", () => {
    const [draft] = buildSeoChangeDrafts([finding("robots-file")], {
      pageUrl: "https://www.example.com/path",
      businessName: "Harbor Workshops",
      description: "",
      tone: "",
      doSay: "",
      dontSay: "",
    });
    assert.match(draft.proposedChange, /Allow: \//);
    assert.equal(/Disallow: \/$/m.test(draft.proposedChange), false);
    assert.equal(/ocean sailing|bunk/i.test(draft.proposedChange), false);
  });
});
