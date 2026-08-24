import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { namedLeadFormUrl, slugForCampaignPart } from "./named-link";

describe("named campaign lead form links", () => {
  it("turns a place and a name into utm query params", () => {
    assert.equal(slugForCampaignPart(" Spring Open House "), "spring-open-house");
    assert.equal(
      namedLeadFormUrl("https://www.groovgro.com/l/demo", "Instagram", "Spring Open House"),
      "https://www.groovgro.com/l/demo?utm_source=instagram&utm_campaign=spring-open-house",
    );
  });

  it("leaves the public form unchanged when the source is empty", () => {
    assert.equal(
      namedLeadFormUrl("https://www.groovgro.com/l/demo", "  "),
      "https://www.groovgro.com/l/demo",
    );
  });

  it("can name only the share when the place is already known", () => {
    assert.equal(
      namedLeadFormUrl("https://www.groovgro.com/l/demo", "newsletter", ""),
      "https://www.groovgro.com/l/demo?utm_source=newsletter",
    );
    assert.equal(
      namedLeadFormUrl("https://www.groovgro.com/l/demo", "", "Spring Open House"),
      "https://www.groovgro.com/l/demo?utm_campaign=spring-open-house",
    );
  });

  it("keeps naming a campaign on Marketing and does not start ads", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/marketing/page.tsx"),
      "utf8",
    );
    assert.match(page, /NamedLeadFormLink/);
    assert.match(page, /will not buy ads/);
    assert.doesNotMatch(page, /google ads/i);
    assert.doesNotMatch(page, /Open Website builder/);

    const observe = readFileSync(
      join(process.cwd(), "src/lib/intelligence/observe.ts"),
      "utf8",
    );
    assert.match(observe, /Name the campaign on shared links/);
    assert.match(observe, /href: "\/app\/marketing"/);
    assert.match(observe, /will not buy ads/);
    assert.doesNotMatch(observe, /google ads/i);
  });
});
