import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_HTML_BYTES, readCappedResponseText } from "./fetch";

describe("capped public fetch", () => {
  it("stops reading after the HTML cap so a huge page cannot fill memory", async () => {
    const huge = "x".repeat(MAX_HTML_BYTES + 50_000);
    const body = await readCappedResponseText(new Response(huge));
    assert.ok(body.length <= MAX_HTML_BYTES);
    assert.ok(body.length > 0);
  });
});
