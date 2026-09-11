import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_HTML_BYTES,
  explainPublicFetchFailure,
  fetchPublicText,
  isChallengeHtml,
  isUsablePublicHtml,
  readCappedResponseText,
} from "./fetch";

function streamFromChunks(chunks: Uint8Array[]) {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[index]);
      index += 1;
    },
  });
}

describe("capped public fetch", () => {
  it("stops reading after the HTML cap so a huge page cannot fill memory", async () => {
    const huge = "x".repeat(MAX_HTML_BYTES + 50_000);
    const body = await readCappedResponseText(new Response(huge));
    assert.ok(body.length <= MAX_HTML_BYTES);
    assert.ok(body.length > 0);
  });

  it("keeps reading after an empty first chunk", async () => {
    const html = "<html><title>Harbor Skills</title></html>";
    const body = await readCappedResponseText(
      new Response(
        streamFromChunks([
          new Uint8Array(),
          new TextEncoder().encode(html),
        ]),
      ),
    );
    assert.match(body, /Harbor Skills/);
  });

  it("treats a named public page as readable and rejects a bot check page", () => {
    assert.equal(
      isUsablePublicHtml("<html><title>Morse Alpha</title><h1>Sailing</h1></html>"),
      true,
    );
    assert.equal(isChallengeHtml("Just a moment... Checking your browser"), true);
    assert.equal(
      isUsablePublicHtml("<html><title>Just a moment...</title></html>"),
      false,
    );
    assert.match(
      explainPublicFetchFailure({ ok: false, status: 403, body: "" }),
      /blocked the automated read/,
    );
    assert.match(
      explainPublicFetchFailure({ ok: false, status: 0, body: "" }),
      /could not reach/,
    );
  });

  it("does not discard a page when the final URL is empty and retries a blocked first read", async () => {
    const original = globalThis.fetch;
    const html = "<html><head><title>Harbor Skills</title></head><body><h1>Class</h1></body></html>";
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("", { status: 403 });
      }
      return new Response(html, { status: 200 });
    }) as typeof fetch;
    try {
      const fetched = await fetchPublicText("https://harborskills.example/");
      assert.equal(calls, 2);
      assert.equal(fetched.ok, true);
      assert.match(fetched.body, /Harbor Skills/);
    } finally {
      globalThis.fetch = original;
    }
  });
});
