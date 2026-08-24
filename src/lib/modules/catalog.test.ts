import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isModuleEnabled, MODULE_CATALOG, navModules } from "./catalog";

describe("module catalog", () => {
  it("does not require the website builder for other modules", () => {
    const withoutBuilder = MODULE_CATALOG.filter(
      (module) => module.id !== "website_builder",
    ).map((module) => module.id);

    assert.equal(isModuleEnabled(withoutBuilder, "crm"), true);
    assert.equal(isModuleEnabled(withoutBuilder, "website_builder"), false);
  });

  it("hides later-phase nav until entitled", () => {
    const items = navModules(["brand"], "work");
    assert.equal(
      items.some((item) => item.id === "website_builder"),
      false,
    );
  });

  it("shows Phase 2 work modules when they are enabled", () => {
    const items = navModules(
      ["website_connect", "events", "crm", "commerce"],
      "work",
    );
    assert.equal(items.some((item) => item.id === "crm"), true);
    assert.equal(items.some((item) => item.id === "website_builder"), false);
  });

  it("shows Phase 3 marketing in grow nav when entitled", () => {
    const items = navModules(["marketing", "analytics"], "grow");
    assert.equal(items.some((item) => item.id === "marketing"), true);
    assert.equal(items.some((item) => item.id === "seo"), false);
  });

  it("shows Phase 4 intelligence in grow nav when entitled", () => {
    const items = navModules(["intelligence", "marketing"], "grow");
    assert.equal(items.some((item) => item.id === "intelligence"), true);
    assert.equal(items.some((item) => item.id === "website_builder"), false);
  });

  it("shows Phase 5 brand voice in grow nav when entitled", () => {
    const items = navModules(["brand_voice", "intelligence"], "grow");
    assert.equal(items.some((item) => item.id === "brand_voice"), true);
    assert.equal(items.some((item) => item.id === "seo"), false);
  });

  it("shows Phase 6 SEO in grow nav when entitled", () => {
    const items = navModules(["seo", "brand_voice"], "grow");
    assert.equal(items.some((item) => item.id === "seo"), true);
    assert.equal(items.some((item) => item.id === "website_builder"), false);
  });

  it("shows Phase 7 website builder in work nav when entitled", () => {
    const items = navModules(["website_builder", "website_connect"], "work");
    assert.equal(items.some((item) => item.id === "website_builder"), true);
    assert.equal(items.some((item) => item.id === "website_connect"), true);
  });

  it("lets Business, Offers, and Goals be enabled independently of the builder", () => {
    const enabled = ["business_brain", "offers", "growth_goals"];
    assert.equal(isModuleEnabled(enabled, "business_brain"), true);
    assert.equal(isModuleEnabled(enabled, "offers"), true);
    assert.equal(isModuleEnabled(enabled, "growth_goals"), true);
    assert.equal(isModuleEnabled(enabled, "website_builder"), false);
    assert.equal(
      navModules(enabled, "work").some((item) => item.id === "offers"),
      true,
    );
    assert.equal(
      navModules(enabled, "grow").some((item) => item.id === "growth_goals"),
      true,
    );
  });

  it("shows Next step in grow nav independently of the website builder", () => {
    const enabled = ["growth_next", "growth_goals"];
    assert.equal(isModuleEnabled(enabled, "growth_next"), true);
    assert.equal(isModuleEnabled(enabled, "website_builder"), false);
    assert.equal(
      navModules(enabled, "grow").some((item) => item.id === "growth_next"),
      true,
    );
    assert.equal(
      MODULE_CATALOG.find((module) => module.id === "growth_next")?.href,
      "/app/next-step",
    );
  });

  it("puts Next step first after Dashboard in the signed-in nav", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/app-shell.tsx"),
      "utf8",
    );
    assert.match(
      source,
      /label="Dashboard"[\s\S]*\{nextStep \?[\s\S]*work\.map/,
    );
    assert.match(source, /growRest/);
    assert.doesNotMatch(source, /\{grow\.map/);
  });

  it("shows Your work in grow nav independently of the website builder", () => {
    const enabled = ["growth_work", "growth_goals"];
    assert.equal(isModuleEnabled(enabled, "growth_work"), true);
    assert.equal(isModuleEnabled(enabled, "website_builder"), false);
    assert.equal(
      navModules(enabled, "grow").some((item) => item.id === "growth_work"),
      true,
    );
    assert.equal(
      MODULE_CATALOG.find((module) => module.id === "growth_work")?.href,
      "/app/work",
    );
  });

  it("keeps Growth review independent of reputation Reviews and the builder", () => {
    const enabled = ["growth_reviews", "growth_goals"];
    assert.equal(isModuleEnabled(enabled, "growth_reviews"), true);
    assert.equal(isModuleEnabled(enabled, "reviews"), false);
    assert.equal(isModuleEnabled(enabled, "website_builder"), false);
    assert.equal(
      navModules(enabled, "grow").some((item) => item.id === "growth_reviews"),
      true,
    );
    assert.equal(
      MODULE_CATALOG.find((module) => module.id === "growth_reviews")?.href,
      "/app/growth-review",
    );
    assert.equal(
      MODULE_CATALOG.find((module) => module.id === "reviews")?.href,
      "/app/reviews",
    );
  });

  it("keeps a labeled Menu button so phones can open the app nav", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/app-shell.tsx"),
      "utf8",
    );
    assert.match(source, /Menu/);
    assert.match(source, /md:hidden/);
    assert.match(source, /app-mobile-menu/);
  });

  it("puts a Next step button in the phone header", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/app-shell.tsx"),
      "utf8",
    );
    assert.match(source, /isModuleEnabled\(session.enabledModules, "growth_next"\)/);
    assert.match(
      source,
      /aria-controls="app-mobile-menu"[\s\S]*href="\/app\/next-step">Next step/,
    );
  });
});
