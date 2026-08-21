import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseContentWidth,
  ROW_CONTENT_WIDTHS,
  rowContentInnerClass,
  rowContentWidthLabel,
} from "./layout";

describe("builder row width", () => {
  it("offers four widths and defaults unknown values to normal", () => {
    assert.deepEqual(
      ROW_CONTENT_WIDTHS.map((option) => option.id),
      ["narrow", "normal", "wide", "full"],
    );
    assert.equal(parseContentWidth("full"), "full");
    assert.equal(parseContentWidth("narrow"), "narrow");
    assert.equal(parseContentWidth(""), "normal");
    assert.equal(parseContentWidth("edge"), "normal");
    assert.equal(rowContentWidthLabel("full"), "Edge to edge");
  });

  it("boxes normal rows and lets edge-to-edge rows span the screen", () => {
    assert.match(rowContentInnerClass("narrow"), /max-w-3xl/);
    assert.match(rowContentInnerClass("normal"), /max-w-6xl/);
    assert.match(rowContentInnerClass("wide"), /max-w-7xl/);
    assert.equal(rowContentInnerClass("full").includes("max-w-"), false);
    assert.match(rowContentInnerClass("full"), /^w-full$/);
  });
});
