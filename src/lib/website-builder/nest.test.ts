import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findLayoutRow,
  flattenLayoutWidgets,
  innerRowsForColumn,
  MAX_INNER_ROWS_PER_COLUMN,
  nestBuilderRows,
  rowHasPublishedContent,
} from "./nest";
import type { BuilderLayoutRow, BuilderLayoutWidget } from "./types";

function widget(id: string, columnIndex = 0): BuilderLayoutWidget {
  return {
    id,
    type: "text",
    visible: true,
    columnIndex,
    sortOrder: 0,
    content: { body: id },
  };
}

function row(
  id: string,
  extras: Partial<BuilderLayoutRow> = {},
): BuilderLayoutRow {
  return {
    id,
    sortOrder: 0,
    columnWidths: [100],
    backgroundColor: "",
    contentWidth: "normal",
    parentRowId: null,
    parentColumnIndex: null,
    widgets: [],
    innerRows: [],
    ...extras,
  };
}

describe("builder inner rows", () => {
  it("nests one level of inner rows under the matching parent column", () => {
    const nested = nestBuilderRows([
      row("outer", { sortOrder: 0, columnWidths: [50, 50] }),
      row("inner-b", {
        sortOrder: 1,
        parentRowId: "outer",
        parentColumnIndex: 1,
        widgets: [widget("right")],
      }),
      row("inner-a", {
        sortOrder: 0,
        parentRowId: "outer",
        parentColumnIndex: 1,
        widgets: [widget("first")],
      }),
      row("other", { sortOrder: 1 }),
    ]);

    assert.equal(nested.length, 2);
    assert.equal(nested[0]?.id, "outer");
    assert.deepEqual(
      nested[0]?.innerRows.map((inner) => inner.id),
      ["inner-a", "inner-b"],
    );
    assert.deepEqual(
      innerRowsForColumn(nested[0]!, 1).map((inner) => inner.id),
      ["inner-a", "inner-b"],
    );
    assert.deepEqual(innerRowsForColumn(nested[0]!, 0), []);
    assert.equal(nested[1]?.id, "other");
    assert.deepEqual(nested[1]?.innerRows, []);
  });

  it("does not nest a row inside an inner row", () => {
    const nested = nestBuilderRows([
      row("outer"),
      row("inner", { parentRowId: "outer", parentColumnIndex: 0 }),
      row("too-deep", { parentRowId: "inner", parentColumnIndex: 0, widgets: [widget("lost")] }),
    ]);

    assert.equal(nested.length, 2);
    assert.equal(nested[0]?.id, "outer");
    assert.equal(nested[0]?.innerRows[0]?.id, "inner");
    assert.deepEqual(nested[0]?.innerRows[0]?.innerRows, []);
    assert.equal(nested[1]?.id, "too-deep");
    assert.equal(nested[1]?.parentRowId, null);
  });

  it("flattens widgets for SEO and keeps a parent that only has inner content", () => {
    const parent = row("outer", {
      innerRows: [
        row("inner", {
          parentRowId: "outer",
          parentColumnIndex: 0,
          widgets: [widget("inside")],
        }),
      ],
    });
    assert.deepEqual(
      flattenLayoutWidgets([parent]).map((item) => item.id),
      ["inside"],
    );
    assert.equal(rowHasPublishedContent(parent), true);
    assert.equal(rowHasPublishedContent(row("empty")), false);
    assert.equal(findLayoutRow([parent], "inner")?.id, "inner");
    assert.equal(MAX_INNER_ROWS_PER_COLUMN, 3);
  });
});
