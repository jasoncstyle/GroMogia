import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { layoutIdForWidths, moveSectionId, ROW_LAYOUTS, widthsForLayout } from "./layout";
import {
  builderTemplateLabel,
  BUILDER_TEMPLATES,
  DEFAULT_BUILDER_TEMPLATE_ID,
  layoutForTemplate,
  themeForTemplate,
} from "./templates";

const brand = {
  businessName: "Harbor Workshops",
  description: "Hands-on classes for beginners.",
  targetCustomers: "people who want practical skills",
};

describe("website builder templates", () => {
  it("offers four numbered layouts and uses Template 1 by default", () => {
    assert.equal(BUILDER_TEMPLATES.length, 4);
    assert.deepEqual(
      BUILDER_TEMPLATES.map((template) => template.id),
      ["1", "2", "3", "4"],
    );
    assert.equal(DEFAULT_BUILDER_TEMPLATE_ID, "1");
    assert.equal(builderTemplateLabel("1"), "Template 1");
    assert.equal(builderTemplateLabel(""), "Custom layout");
    assert.deepEqual(widthsForLayout("1-1-1"), [34, 33, 33]);
    assert.equal(ROW_LAYOUTS.some((layout) => layout.id === "1-1-1"), true);
    assert.equal(layoutIdForWidths([34, 33, 33]), "1-1-1");
    assert.equal(layoutIdForWidths([50, 50]), "1-1");
  });

  it("builds each numbered layout from brand copy without copying other websites", () => {
    for (const template of BUILDER_TEMPLATES) {
      const rows = layoutForTemplate(template.id, brand);
      assert.ok(rows.some((row) => row.widgets.some((widget) => widget.type === "hero")));
      assert.ok(rows.some((row) => row.widgets.some((widget) => widget.type === "lead")));
      assert.equal(rows[0]?.contentWidth, "full");
      assert.equal(
        /ocean sailing|myrtle beach|bunk|adtriox|crafto|bontempi|neuropelvic|sailing/i.test(
          JSON.stringify(rows),
        ),
        false,
      );
    }
  });

  it("gives Template 1 a dark edge-to-edge welcome and three offer columns", () => {
    const rows = layoutForTemplate("1", brand);
    assert.equal(themeForTemplate("1").pageBackground, "#18181b");
    assert.equal(rows[0]?.contentWidth, "full");
    assert.ok(rows.some((row) => row.columnWidths.length === 3));
    assert.ok(rows.every((row) => !row.backgroundColor));
  });

  it("falls back to Template 1 when the template is unknown", () => {
    const rows = layoutForTemplate("not-a-template", brand);
    const fallback = layoutForTemplate("1", brand);
    assert.equal(rows[0]?.widgets[0]?.type, "hero");
    assert.equal(rows.length, fallback.length);
    assert.ok(rows.some((row) => row.widgets.some((widget) => widget.type === "lead")));
  });

  it("reorders widgets inside a column without dropping any", () => {
    assert.deepEqual(moveSectionId(["a", "b", "c"], "b", "up"), ["b", "a", "c"]);
  });
});
