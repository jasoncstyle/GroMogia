import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  formatGoogleApiError,
  googleAuthorizeUrl,
  searchAnalyticsQueryBody,
  searchConsoleWindow,
} from "./google-search-console";

describe("google search console adapter", () => {
  it("requests only the Search Console read-only scope", () => {
    const url = googleAuthorizeUrl("state-token", {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://www.groovgro.com/api/google/callback",
    });
    assert.match(url, /webmasters\.readonly/);
    assert.match(url, /access_type=offline/);
    assert.equal(/adwords|googleads|analytics\.readonly/i.test(url), false);
  });

  it("uses a 28-day window that ends three days ago", () => {
    const window = searchConsoleWindow(new Date("2026-08-20T15:00:00Z"));
    assert.equal(window.endDate, "2026-08-17");
    assert.equal(window.startDate, "2026-07-21");
  });

  it("asks Google for web results with the current type field", () => {
    const body = searchAnalyticsQueryBody({
      startDate: "2026-07-21",
      endDate: "2026-08-17",
      dimensions: ["query"],
      rowLimit: 10,
    });
    assert.equal(body.type, "web");
    assert.equal("searchType" in body, false);
  });

  it("does not show Google's raw Bad Request to the owner", () => {
    const fallback =
      "Search Console could not read those numbers. Disconnect, then connect Search Console again. GroovGro did not change the website.";
    assert.equal(
      formatGoogleApiError({ error: { message: "Bad Request" } }, fallback),
      fallback,
    );
    assert.match(
      formatGoogleApiError(
        { error: { message: "siteUrl is not a valid Search Console property" } },
        fallback,
      ),
      /siteUrl is not a valid Search Console property/,
    );

    const adapter = readFileSync(join(process.cwd(), "src/modules/integrations/google-search-console.ts"), "utf8");
    assert.doesNotMatch(adapter, /searchType/);
    const panel = readFileSync(
      join(process.cwd(), "src/components/search-console-panel.tsx"),
      "utf8",
    );
    assert.match(panel, /searchConsole\.lastError/);
  });
});
