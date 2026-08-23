import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { draftInspiredCopy } from "./inspired-copy";
import { draftInspiredRows } from "./inspiration";
import {
  completeOwnedCopyFacts,
  draftAboutPageRows,
  draftAreasPageRows,
  draftContactPageRows,
  draftOwnedHomeRows,
  draftWorkPageRows,
  ownedChromeFooter,
  ownedExtraPages,
  ownedHomeMeta,
  ownedOfferPagePlans,
  readBrandContact,
  readBrandSocialLinks,
} from "./owned-site";

const facts = completeOwnedCopyFacts({
  businessName: "Harbor Workshops",
  description: "Hands-on classes for beginners.",
  targetCustomers: "people who want practical skills",
  businessType: "workshops",
  locations: ["the harbor studio"],
  serviceAreas: ["the waterfront"],
  notes: "",
  inferredSummary: "",
  offers: [{ name: "Weekend Workshop", description: "A two-day starter session." }],
  topics: [],
  questions: [],
  operatingHours: "Weekdays 9am-5pm",
  contactEmail: "hello@example.com",
  contactPhone: "+15551234567",
  contactAddress: "the harbor studio",
  socialLinks: [{ label: "Instagram", url: "https://www.instagram.com/example" }],
});

const copy = draftInspiredCopy(facts);

describe("owned GroovGro website draft", () => {
  it("fills topic and question gaps from the owner’s facts", () => {
    assert.equal(facts.topics.includes("Weekend Workshop"), true);
    assert.equal(facts.topics.length >= 3, true);
    assert.equal(facts.questions.includes("How do I get started?"), true);
    assert.equal(facts.questions.includes("Where do you work?"), true);
  });

  it("drafts Home, About, and Work without pasted websites", () => {
    const rows = draftInspiredRows({
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      targetCustomers: "people who want practical skills",
      businessType: "workshops",
      offers: [{ name: "Weekend Workshop", description: "A two-day starter session." }],
      layoutPages: [],
      copyPages: [],
    });
    const json = JSON.stringify(rows);
    assert.match(json, /Harbor Workshops/);
    assert.match(json, /Hands-on classes for beginners/);
    assert.match(json, /Weekend Workshop/);
    assert.equal(rows.some((row) => row.widgets.some((widget) => widget.type === "hero")), true);
    assert.equal(rows.some((row) => row.widgets.some((widget) => widget.type === "lead")), true);

    const about = JSON.stringify(draftAboutPageRows(copy, "jasons-test"));
    const work = JSON.stringify(draftWorkPageRows(copy, "jasons-test"));
    assert.match(about, /About Harbor Workshops/);
    assert.match(work, /Weekend Workshop/);
  });

  it("drafts a complete first website with linked pages", () => {
    const home = draftOwnedHomeRows({ orgSlug: "jasons-test", copy, facts });
    const homeJson = JSON.stringify(home);
    assert.match(homeJson, /Harbor Workshops/);
    assert.match(homeJson, /How it works/);
    assert.match(homeJson, /\/w\/jasons-test\/about/);
    assert.match(homeJson, /\/w\/jasons-test\/work/);
    assert.match(homeJson, /\/w\/jasons-test\/contact/);
    assert.match(homeJson, /\/w\/jasons-test\/faq/);
    assert.match(homeJson, /\/w\/jasons-test\/areas/);
    assert.match(homeJson, /\/w\/jasons-test\/weekend-workshop/);
    assert.match(homeJson, /Weekdays 9am-5pm/);
    assert.equal(home.some((row) => row.widgets.some((widget) => widget.type === "lead")), true);

    const extras = ownedExtraPages({ orgSlug: "jasons-test", copy, facts });
    assert.deepEqual(
      extras.map((page) => page.slug),
      ["about", "work", "weekend-workshop", "areas", "faq", "contact"],
    );
    const contact = JSON.stringify(draftContactPageRows(copy, facts));
    assert.match(contact, /hello@example.com/);
    assert.match(contact, /\+15551234567/);
    assert.match(contact, /instagram.com/);
    const areas = JSON.stringify(draftAreasPageRows(copy, facts, "jasons-test"));
    assert.match(areas, /harbor studio/);
    assert.match(areas, /\/w\/jasons-test\/contact/);
    assert.match(ownedHomeMeta(copy), /Hands-on classes/);
    assert.match(ownedChromeFooter("Harbor Workshops"), /Harbor Workshops/);
  });

  it("skips area pages when there is no place to name", () => {
    const thin = completeOwnedCopyFacts({
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
    const thinCopy = draftInspiredCopy(thin);
    assert.deepEqual(
      ownedExtraPages({ orgSlug: "jasons-test", copy: thinCopy, facts: thin }).map((page) => page.slug),
      ["about", "work", "faq", "contact"],
    );
  });

  it("reads brand contact and public social links without inventing them", () => {
    assert.deepEqual(
      readBrandContact({ Email: "hello@example.com", phone: "+15551234567" }),
      {
        email: "hello@example.com",
        phone: "+15551234567",
        address: "",
      },
    );
    assert.deepEqual(readBrandSocialLinks({ Instagram: "https://www.instagram.com/example" }), [
      { label: "Instagram", url: "https://www.instagram.com/example" },
    ]);
    assert.deepEqual(readBrandSocialLinks({ Instagram: "not-a-link" }), []);
    assert.equal(ownedOfferPagePlans([{ name: "Weekend Workshop", description: "" }])[0]?.slug, "weekend-workshop");
  });

  it("does not bake industry-specific words into owned-site helpers", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/website-builder/owned-site.ts"),
      "utf8",
    );
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
