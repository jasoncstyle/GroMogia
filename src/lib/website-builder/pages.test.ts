import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BLANK_PAGE_TEMPLATE_ID,
  builderPageLabel,
  builderPagePath,
  isHomePageSlug,
  layoutForNewPage,
  parsePageSlug,
  suggestPageSlug,
  uniqueSavedHomeSlug,
  uniqueSavedHomeTitle,
} from "./pages";

const brand = {
  businessName: "Harbor Workshops",
  description: "Hands-on classes for beginners.",
  targetCustomers: "people who want practical skills",
};

describe("builder extra pages", () => {
  it("treats an empty slug as Home and extra slugs as public paths", () => {
    assert.equal(isHomePageSlug(""), true);
    assert.equal(isHomePageSlug("about"), false);
    assert.equal(builderPageLabel({ slug: "", title: "Harbor Workshops" }), "Home");
    assert.equal(builderPageLabel({ slug: "about", title: "About us" }), "About us");
    assert.equal(builderPagePath("jasons-test"), "/w/jasons-test");
    assert.equal(builderPagePath("jasons-test", "about"), "/w/jasons-test/about");
  });

  it("names a saved Home page without colliding with one already there", () => {
    assert.equal(uniqueSavedHomeSlug([]), "saved-home");
    assert.equal(uniqueSavedHomeSlug(["saved-home"]), "saved-home-2");
    assert.equal(uniqueSavedHomeTitle([]), "Previous Home");
    assert.equal(uniqueSavedHomeTitle(["Previous Home"]), "Previous Home 2");
  });

  it("suggests a safe address from the page name", () => {
    assert.equal(suggestPageSlug("About us"), "about-us");
    assert.equal(suggestPageSlug("  Services & Pricing  "), "services-pricing");
  });

  it("rejects reserved or unsafe page addresses", () => {
    assert.equal(parsePageSlug("About"), "about");
    assert.throws(() => parsePageSlug("home"), /reserved/);
    assert.throws(() => parsePageSlug(""), /address/);
    assert.throws(() => parsePageSlug("about/us"), /lowercase letters/);
    assert.throws(() => parsePageSlug("../etc"), /lowercase letters/);
  });

  it("starts a blank page as one empty row without copying other websites", () => {
    const blank = layoutForNewPage(BLANK_PAGE_TEMPLATE_ID, brand);
    assert.equal(blank.templateId, "blank");
    assert.equal(blank.theme.pageBackground, "#ffffff");
    assert.equal(blank.rows.length, 1);
    assert.equal(blank.rows[0]?.widgets.length, 0);
    const templated = layoutForNewPage("1", brand);
    assert.ok(templated.rows.some((row) => row.widgets.some((widget) => widget.type === "hero")));
    assert.equal(
      /ocean sailing|adtriox|sailing/i.test(JSON.stringify(blank) + JSON.stringify(templated)),
      false,
    );
  });
});
