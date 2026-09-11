import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fetchNamedPublicPage, namedPageReaderUrl } from "./page-reader";
import { fetchPublicText } from "@/lib/seo/fetch";

describe("named public page reader", () => {
  it("builds a reader URL only for the owner-named public page", () => {
    const reader = namedPageReaderUrl("https://harborskills.example/courses");
    assert.equal(
      reader?.toString(),
      "https://r.jina.ai/https://harborskills.example/courses",
    );
    assert.equal(namedPageReaderUrl("http://127.0.0.1/"), null);
    assert.equal(namedPageReaderUrl("file:///etc/passwd"), null);
  });

  it("uses the reader after a blocked direct read and does not search Google", async () => {
    const original = globalThis.fetch;
    const markdown = [
      "Title: Harbor Skills",
      "URL Source: https://harborskills.example/",
      "",
      "## Weekend beginner class",
      "Book a date for a coastal trip.",
    ].join("\n");
    const seen: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const href = String(input);
      seen.push(href);
      if (href.includes("r.jina.ai")) {
        return new Response(markdown, { status: 200 });
      }
      return new Response("", { status: 403 });
    }) as typeof fetch;
    try {
      const fetched = await fetchNamedPublicPage("https://harborskills.example/");
      assert.equal(fetched.ok, true);
      assert.match(fetched.body, /Harbor Skills/);
      assert.equal(seen.some((href) => href.includes("r.jina.ai/https://harborskills.example")), true);
      assert.equal(seen.some((href) => /google\.com\/search/i.test(href)), false);
      const direct = await fetchPublicText("https://harborskills.example/");
      assert.equal(direct.ok, false);
    } finally {
      globalThis.fetch = original;
    }
  });
});
