import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  headingClassName,
  isDarkBuilderColor,
  parseBuilderColor,
  parseBuilderTheme,
  parseHeadingLevel,
} from "./style";

describe("builder colors and headings", () => {
  it("keeps only six-digit hex colors", () => {
    assert.equal(parseBuilderColor("#112233"), "#112233");
    assert.equal(parseBuilderColor("#ABC"), "");
    assert.equal(parseBuilderColor("red"), "");
    assert.equal(parseBuilderColor("javascript:alert(1)"), "");
  });

  it("parses a page theme without extra keys", () => {
    const theme = parseBuilderTheme({
      pageBackground: "#0f2744",
      textColor: "#ffffff",
      junk: "nope",
    });
    assert.equal(theme.pageBackground, "#0f2744");
    assert.equal(theme.textColor, "#ffffff");
    assert.equal(theme.headingColor, "");
  });

  it("treats navy as a dark background", () => {
    assert.equal(isDarkBuilderColor("#0f2744"), true);
    assert.equal(isDarkBuilderColor("#ffffff"), false);
  });

  it("falls back to heading 2 when the size is blank", () => {
    assert.equal(parseHeadingLevel("", "h2"), "h2");
    assert.equal(parseHeadingLevel("h1", "h2"), "h1");
    assert.equal(headingClassName("p", false).includes("text-base"), true);
  });
});
