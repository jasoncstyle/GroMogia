import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { draftInspiredCopy } from "./inspired-copy";

describe("inspired website copy", () => {
  it("writes launchable sentences from the owner’s facts, not placeholder prompts", () => {
    const copy = draftInspiredCopy({
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      targetCustomers: "people who want practical skills",
      businessType: "workshops",
      locations: ["the harbor studio"],
      serviceAreas: [],
      notes: "",
      inferredSummary: "",
      offers: [
        { name: "Weekend Workshop", description: "A two-day starter session." },
        { name: "Private Session", description: "" },
      ],
      topics: ["Weekend Workshop", "Group Practice"],
      questions: ["How do I get started?"],
    });

    assert.equal(copy.heroHeading, "Harbor Workshops");
    assert.match(copy.heroSubheading, /Hands-on classes for beginners/);
    assert.match(copy.introBody, /people who want practical skills/);
    assert.match(copy.aboutBody, /harbor studio/);
    assert.match(copy.featureItems.join("\n"), /Weekend Workshop/);
    assert.match(copy.featureItems.join("\n"), /two-day starter session/);
    assert.match(copy.topicBodies[0] ?? "", /two-day starter session/);
    assert.match(copy.faqItems[0] ?? "", /How do I get started\?/);
    assert.match(copy.ctaBody, /Harbor Workshops/);
    assert.match(copy.leadBody, /form is hosted by GroovGro/);
    assert.doesNotMatch(JSON.stringify(copy), /your own words|starting label only/i);
  });

  it("still produces a complete page when Brand is thin", () => {
    const copy = draftInspiredCopy({
      businessName: "North Desk",
      description: "",
      targetCustomers: "",
      businessType: "",
      locations: [],
      serviceAreas: [],
      notes: "",
      inferredSummary: "",
      offers: [],
      topics: [],
      questions: [],
    });
    assert.match(copy.heroSubheading, /North Desk/);
    assert.match(copy.aboutBody, /North Desk/);
    assert.match(copy.leadBody, /Get in touch|follow up|form/i);
  });

  it("does not bake industry-specific words into copy helpers", () => {
    const source = [
      readFileSync(join(process.cwd(), "src/lib/website-builder/inspired-copy.ts"), "utf8"),
      readFileSync(join(process.cwd(), "src/lib/website-builder/inspired-copy-ai.ts"), "utf8"),
    ].join("\n");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
