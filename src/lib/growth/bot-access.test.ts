import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  createBotAccessTokenValue,
  hashBotAccessToken,
  readBotAccessToken,
  tokensMatch,
} from "./bot-access";

describe("bot desk access", () => {
  it("hashes a token and matches only that token", () => {
    const token = createBotAccessTokenValue();
    assert.match(token, /^ggbot_[a-f0-9]{48}$/);
    const hash = hashBotAccessToken(token);
    assert.equal(hash.length, 64);
    assert.equal(tokensMatch(token, hash), true);
    assert.equal(tokensMatch(`${token}x`, hash), false);
    assert.equal(tokensMatch(token, "00"), false);
  });

  it("reads a bearer token or the GroovGro header", () => {
    assert.equal(
      readBotAccessToken({
        headers: {
          get(name) {
            return name === "authorization" ? "Bearer ggbot_abc" : null;
          },
        },
      }),
      "ggbot_abc",
    );
    assert.equal(
      readBotAccessToken({
        headers: {
          get(name) {
            return name === "x-groovgro-bot-token" ? "ggbot_from_header" : null;
          },
        },
      }),
      "ggbot_from_header",
    );
  });

  it("serves the stored desk without talking to Google", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/bots/search-desk/route.ts"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/bot-access.ts"),
      "utf8",
    );
    assert.match(route, /getSearchDeskForBots/);
    assert.match(route, /requireBotOrganization/);
    assert.doesNotMatch(route, /googleapis|searchconsole|generateText/i);
    assert.match(action, /tokenHash: hashBotAccessToken/);
    assert.doesNotMatch(action, /googleapis|searchconsole/i);
  });
});
