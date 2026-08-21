import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { moveSectionId, moveSectionIdToIndex } from "./layout";
import { BUILDER_TEMPLATES, sectionsForTemplate } from "./templates";

const brand = {
  businessName: "Harbor Workshops",
  description: "Hands-on classes for beginners.",
  targetCustomers: "people who want practical skills",
};

describe("website builder templates", () => {
  it("offers six generic starting layouts", () => {
    assert.equal(BUILDER_TEMPLATES.length, 6);
    for (const template of BUILDER_TEMPLATES) {
      const sections = sectionsForTemplate(template.id, brand);
      assert.ok(sections.length >= 3);
      assert.equal(sections.some((section) => section.type === "hero"), true);
      assert.equal(
        sections.some((section) => section.type === "lead"),
        true,
      );
      assert.equal(
        /ocean sailing|myrtle beach|bunk/i.test(JSON.stringify(sections)),
        false,
      );
    }
  });

  it("falls back to the simple intro when the template is unknown", () => {
    const sections = sectionsForTemplate("not-a-template", brand);
    assert.equal(sections.some((section) => section.type === "hero"), true);
    assert.equal(sections.at(-1)?.type, "lead");
  });

  it("reorders section boxes without dropping any", () => {
    const ids = ["a", "b", "c"];
    assert.deepEqual(moveSectionId(ids, "b", "up"), ["b", "a", "c"]);
    assert.deepEqual(moveSectionId(ids, "a", "down"), ["b", "a", "c"]);
    assert.deepEqual(moveSectionIdToIndex(ids, "c", "a"), ["c", "a", "b"]);
  });
});
