import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
});
