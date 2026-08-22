import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_BUILDER_CHROME,
  parseBuilderChrome,
  parseChromeLogoUrl,
  resolveBuilderChrome,
} from "./chrome";

describe("builder header and footer", () => {
  it("defaults to a visible header, footer, and page links", () => {
    const parsed = parseBuilderChrome(null);
    assert.equal(parsed.showHeader, true);
    assert.equal(parsed.showFooter, true);
    assert.equal(parsed.showPageLinks, true);
    assert.equal(parsed.headerName, "");
    assert.equal(DEFAULT_BUILDER_CHROME.showHeader, true);
  });

  it("uses the brand name when the header name is blank", () => {
    const resolved = resolveBuilderChrome(DEFAULT_BUILDER_CHROME, "Harbor Workshops");
    assert.equal(resolved.title, "Harbor Workshops");
    assert.equal(resolved.footerText, "Harbor Workshops");
    assert.equal(resolved.showHeader, true);
  });

  it("keeps a custom header name and footer line", () => {
    const resolved = resolveBuilderChrome(
      {
        showHeader: true,
        showFooter: true,
        showPageLinks: false,
        headerName: "Harbor",
        logoUrl: "",
        footerText: "Workshops on the waterfront",
        headerBackgroundColor: "#0f2744",
        footerBackgroundColor: "navy",
      },
      "Harbor Workshops",
    );
    assert.equal(resolved.title, "Harbor");
    assert.equal(resolved.footerText, "Workshops on the waterfront");
    assert.equal(resolved.showPageLinks, false);
    assert.equal(resolved.headerBackgroundColor, "#0f2744");
    assert.equal(resolved.footerBackgroundColor, "");
  });

  it("accepts a public https logo and rejects a private address", () => {
    assert.equal(
      parseChromeLogoUrl("https://images.example.com/logo.png"),
      "https://images.example.com/logo.png",
    );
    assert.equal(parseChromeLogoUrl(""), "");
    assert.throws(
      () => parseChromeLogoUrl("http://images.example.com/logo.png"),
      /https/,
    );
  });
});
