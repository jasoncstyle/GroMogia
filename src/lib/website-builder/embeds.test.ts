import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  builderMapEmbedSrc,
  builderTelHref,
  builderWhatsAppHref,
  parseBuilderVideoEmbed,
} from "./embeds";

describe("builder embeds", () => {
  it("turns YouTube and Vimeo links into embed addresses", () => {
    const youtube = parseBuilderVideoEmbed("https://www.youtube.com/watch?v=dQw4w9wgGcQ");
    assert.equal(youtube?.src, "https://www.youtube.com/embed/dQw4w9wgGcQ");
    const short = parseBuilderVideoEmbed("https://youtu.be/dQw4w9wgGcQ");
    assert.equal(short?.provider, "youtube");
    const vimeo = parseBuilderVideoEmbed("https://vimeo.com/123456789");
    assert.equal(vimeo?.src, "https://player.vimeo.com/video/123456789");
    assert.equal(parseBuilderVideoEmbed("https://example.com/watch"), null);
  });

  it("builds a maps embed from a place name", () => {
    const src = builderMapEmbedSrc("Harbor Workshops, Springfield");
    assert.equal(src?.includes("maps.google.com"), true);
    assert.equal(builderMapEmbedSrc("<script>"), null);
  });

  it("builds call and WhatsApp links", () => {
    assert.equal(builderTelHref("+1 555 555 0100"), "tel:+15555550100");
    assert.equal(builderWhatsAppHref("1 (555) 555-0100"), "https://wa.me/15555550100");
    assert.equal(builderWhatsAppHref("12"), null);
  });
});
