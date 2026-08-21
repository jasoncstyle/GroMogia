import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyApprovedSeoDraftToBuilderState,
  builderApplyHint,
  builderPublicUrl,
  isBuilderApplyableFinding,
  publicBuilderPageSeo,
} from "./apply-seo";

const site = {
  title: "Harbor Workshops",
  metaDescription: "",
  sections: [
    {
      id: "hero-1",
      type: "hero",
      content: { heading: "Old heading", subheading: "Old offer" },
    },
    {
      id: "text-1",
      type: "text",
      content: { heading: "What we do", body: "Classes" },
    },
  ],
};

describe("apply SEO drafts to GroovGro builder", () => {
  it("applies title, description, and first hero heading only", () => {
    const titled = applyApprovedSeoDraftToBuilderState(site, {
      findingId: "title",
      proposedChange: "Harbor Workshops | Hands-on classes",
    });
    assert.equal(titled.title, "Harbor Workshops | Hands-on classes");
    assert.equal(titled.appliedTo, "title");

    const described = applyApprovedSeoDraftToBuilderState(titled, {
      findingId: "description",
      proposedChange: "Hands-on classes for beginners in a small group.",
    });
    assert.equal(
      described.metaDescription,
      "Hands-on classes for beginners in a small group.",
    );

    const headed = applyApprovedSeoDraftToBuilderState(described, {
      findingId: "h1",
      proposedChange: "Learn by making",
    });
    assert.equal(headed.sections[0]?.content.heading, "Learn by making");
    assert.equal(headed.sections[1]?.content.heading, "What we do");
  });

  it("does not apply connected-site files or share tags onto the builder", () => {
    assert.equal(isBuilderApplyableFinding("canonical"), false);
    assert.equal(isBuilderApplyableFinding("robots-file"), false);
    assert.equal(isBuilderApplyableFinding("sitemap"), false);
    assert.throws(() =>
      applyApprovedSeoDraftToBuilderState(site, {
        findingId: "canonical",
        proposedChange: '<link rel="canonical" href="https://www.example.com/" />',
      }),
    );
    assert.match(builderApplyHint("title"), /GroovGro-hosted page only/);
    assert.match(builderApplyHint("sitemap"), /connected website origin/);
  });

  it("builds public metadata for the GroovGro page, not the connected site", () => {
    const canonical = builderPublicUrl("https://www.groovgro.com", "jasons-test");
    assert.equal(canonical, "https://www.groovgro.com/w/jasons-test");
    const seo = publicBuilderPageSeo({
      title: "Harbor Workshops",
      metaDescription: "Hands-on classes for beginners.",
      canonicalUrl: canonical,
      businessName: "Harbor Workshops",
      description: "Unused fallback.",
    });
    assert.equal(seo.canonicalUrl, canonical);
    assert.equal(seo.jsonLd.url, canonical);
    assert.equal(/oceansailingadventures|example\.com/i.test(JSON.stringify(seo)), false);
    assert.equal(/ocean sailing|myrtle beach/i.test(JSON.stringify(seo)), false);
  });
});
