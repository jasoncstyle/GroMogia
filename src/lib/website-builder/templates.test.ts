import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { layoutIdForWidths, moveSectionId, ROW_LAYOUTS, widthsForLayout } from "./layout";
import { layoutForTemplate, BUILDER_TEMPLATES } from "./templates";

const brand = {
  businessName: "Harbor Workshops",
  description: "Hands-on classes for beginners.",
  targetCustomers: "people who want practical skills",
};

describe("website builder templates", () => {
  it("offers six layouts that include a three-column row", () => {
    assert.equal(BUILDER_TEMPLATES.length, 6);
    assert.deepEqual(widthsForLayout("1-1-1"), [34, 33, 33]);
    assert.equal(ROW_LAYOUTS.some((layout) => layout.id === "1-1-1"), true);
    assert.equal(layoutIdForWidths([34, 33, 33]), "1-1-1");
    assert.equal(layoutIdForWidths([50, 50]), "1-1");
    for (const template of BUILDER_TEMPLATES) {
      const rows = layoutForTemplate(template.id, brand);
      assert.ok(rows.some((row) => row.columnWidths.length === 3));
      assert.ok(rows.some((row) => row.widgets.some((widget) => widget.type === "hero")));
      assert.ok(rows.some((row) => row.widgets.some((widget) => widget.type === "lead")));
      assert.equal(
        /ocean sailing|myrtle beach|bunk/i.test(JSON.stringify(rows)),
        false,
      );
    }
  });

  it("falls back to the simple intro when the template is unknown", () => {
    const rows = layoutForTemplate("not-a-template", brand);
    assert.equal(rows[0]?.widgets[0]?.type, "hero");
    assert.ok(rows.some((row) => row.widgets.some((widget) => widget.type === "lead")));
  });

  it("reorders widgets inside a column without dropping any", () => {
    assert.deepEqual(moveSectionId(["a", "b", "c"], "b", "up"), ["b", "a", "c"]);
  });
});
