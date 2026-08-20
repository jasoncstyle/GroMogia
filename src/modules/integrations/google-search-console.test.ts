import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { googleAuthorizeUrl, searchConsoleWindow } from "./google-search-console";

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
});
