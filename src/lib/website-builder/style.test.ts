import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  builderButtonColors,
  headingClassName,
  inheritRowBackgrounds,
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

  it("flips a dark button on a dark row so it can still be seen", () => {
    const theme = parseBuilderTheme({
      buttonBackground: "#0f2744",
      buttonText: "#ffffff",
    });
    const onDark = builderButtonColors(theme, true);
    assert.equal(onDark.backgroundColor, "#ffffff");
    assert.equal(onDark.color, "#18181b");
    const onLight = builderButtonColors(theme, false);
    assert.equal(onLight.backgroundColor, "#0f2744");
  });

  it("lets a new page color show through rows that used the old page color", () => {
    assert.deepEqual(
      inheritRowBackgrounds(["#111111", "#18181b", ""], "#111111", false),
      ["", "#18181b", ""],
    );
    assert.deepEqual(
      inheritRowBackgrounds(["#111111", "#18181b"], "#111111", true),
      ["", ""],
    );
  });
});
