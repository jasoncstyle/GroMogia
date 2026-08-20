import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decryptSecret,
  encryptSecret,
  readOAuthState,
  signOAuthState,
} from "../crypto/secret";
import {
  explainSearchConsole,
  matchSearchConsoleProperty,
  SEARCH_CONSOLE_SCOPE,
  sumSearchConsoleRows,
} from "./search-console";

describe("search console helpers", () => {
  it("matches a domain property to the connected website", () => {
    const result = matchSearchConsoleProperty("https://www.example.com/", [
      "sc-domain:example.com",
      "https://other.test/",
    ]);
    assert.equal(result.matched, "sc-domain:example.com");
    assert.equal(result.candidates.length, 1);
  });

  it("asks the owner to pick when more than one property covers the site", () => {
    const result = matchSearchConsoleProperty("https://www.example.com/classes", [
      "sc-domain:example.com",
      "https://www.example.com/",
      "https://unrelated.test/",
    ]);
    assert.equal(result.matched, null);
    assert.equal(result.candidates.includes("sc-domain:example.com"), true);
    assert.equal(result.candidates.includes("https://www.example.com/"), true);
    assert.equal(result.candidates.includes("https://unrelated.test/"), false);
  });

  it("explains clicks without inventing ads or a site edit", () => {
    const explanation = explainSearchConsole({
      propertyUrl: "sc-domain:example.com",
      startDate: "2026-07-20",
      endDate: "2026-08-16",
      totals: { clicks: 12, impressions: 400, ctr: 0.03, position: 8.2 },
      topQueries: [
        { key: "harbor workshops", clicks: 8, impressions: 200, ctr: 0.04, position: 5 },
      ],
      topPages: [],
    });
    assert.match(explanation.paragraphs.join(" "), /12 clicks/);
    assert.match(explanation.paragraphs.join(" "), /harbor workshops/);
    assert.match(explanation.paragraphs.join(" "), /does not change the website/);
    assert.match(explanation.paragraphs.join(" "), /or buy ads/);
    assert.equal(/google ads/i.test(explanation.paragraphs.join(" ")), false);
    assert.equal(SEARCH_CONSOLE_SCOPE.endsWith("webmasters.readonly"), true);
  });

  it("weights average position by impressions", () => {
    const totals = sumSearchConsoleRows([
      { clicks: 2, impressions: 10, position: 4 },
      { clicks: 0, impressions: 30, position: 12 },
    ]);
    assert.equal(totals.clicks, 2);
    assert.equal(totals.impressions, 40);
    assert.equal(totals.position, (4 * 10 + 12 * 30) / 40);
  });

  it("encrypts a refresh token without putting it in the returned string as plain text", () => {
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret-value";
    const token = "refresh-token-example";
    const stored = encryptSecret(JSON.stringify({ refreshToken: token }));
    assert.equal(stored.includes(token), false);
    const read = JSON.parse(decryptSecret(stored)) as { refreshToken: string };
    assert.equal(read.refreshToken, token);
    const state = signOAuthState({ organizationId: "org-1", userId: "user-1", exp: 1 });
    const parsed = readOAuthState(state);
    assert.equal(parsed.organizationId, "org-1");
  });

  it("does not hard-code a sailing business", () => {
    const explanation = explainSearchConsole({
      propertyUrl: "https://www.example.com/",
      startDate: "2026-07-20",
      endDate: "2026-08-16",
      totals: emptyTotals(),
      topQueries: [],
      topPages: [],
    });
    assert.equal(/ocean sailing|myrtle beach/i.test(explanation.paragraphs.join(" ")), false);
  });
});

function emptyTotals() {
  return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}
