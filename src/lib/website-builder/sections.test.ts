import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultBuilderSections,
  isSafeBuilderHref,
  parseBuilderSectionContent,
  publishedSectionsOnly,
} from "./sections";

describe("website builder sections", () => {
  it("starts from brand copy without requiring a connected website", () => {
    const sections = defaultBuilderSections({
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      targetCustomers: "people who want practical skills",
    });
    assert.equal(sections.some((section) => section.type === "hero"), true);
    assert.equal(sections.some((section) => section.type === "lead"), true);
    assert.equal(
      /ocean sailing|myrtle beach/i.test(JSON.stringify(sections)),
      false,
    );
  });

  it("rejects unsafe button links", () => {
    assert.equal(isSafeBuilderHref("https://example.com/join"), true);
    assert.equal(isSafeBuilderHref("#lead"), true);
    assert.equal(isSafeBuilderHref("/contact"), true);
    assert.equal(isSafeBuilderHref("javascript:alert(1)"), false);
    assert.throws(() =>
      parseBuilderSectionContent("cta", {
        heading: "Go",
        buttonLabel: "Go",
        buttonHref: "javascript:alert(1)",
      }),
    );
  });

  it("hides unpublished sections from the live page", () => {
    const visible = publishedSectionsOnly([
      { visible: true, id: "a" },
      { visible: false, id: "b" },
    ]);
    assert.deepEqual(visible, [{ visible: true, id: "a" }]);
  });
});
