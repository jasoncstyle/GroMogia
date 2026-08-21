import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  builderDisplayImageSrc,
  canProxyBuilderImageUrl,
  isAllowedBuilderImageType,
} from "./image-proxy";

describe("builder image proxy", () => {
  it("allows public https photos and blocks private or looping addresses", () => {
    assert.equal(
      canProxyBuilderImageUrl(
        "https://myrtlebeachsailingschool.com/wp-content/uploads/2023/11/103-104-01a.jpg",
      ),
      true,
    );
    assert.equal(canProxyBuilderImageUrl("http://example.com/a.jpg"), false);
    assert.equal(canProxyBuilderImageUrl("https://127.0.0.1/secret.jpg"), false);
    assert.equal(canProxyBuilderImageUrl("https://www.groovgro.com/x.jpg"), false);
    assert.equal(
      builderDisplayImageSrc("https://images.example.com/hero.jpg").startsWith(
        "/api/builder-image?url=",
      ),
      true,
    );
  });

  it("only serves common photo types", () => {
    assert.equal(isAllowedBuilderImageType("image/jpeg"), true);
    assert.equal(isAllowedBuilderImageType("image/svg+xml"), false);
    assert.equal(isAllowedBuilderImageType("text/html"), false);
  });
});
