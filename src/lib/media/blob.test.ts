import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clipOriginalName,
  extensionForMediaType,
  isAllowedMediaImageType,
  isBlobConfigured,
  isOrgMediaPathname,
  isVercelBlobImageUrl,
  mediaBlobPathname,
} from "./blob";

describe("media blob helpers", () => {
  it("builds a tenant-prefixed pathname and rejects other orgs", () => {
    const orgId = "11111111-1111-1111-1111-111111111111";
    const pathname = mediaBlobPathname(orgId, "image/jpeg", "Harbor.jpg");
    assert.match(pathname, new RegExp(`^org/${orgId}/builder/[a-z0-9-]+\\.jpg$`));
    assert.equal(isOrgMediaPathname(orgId, pathname), true);
    assert.equal(
      isOrgMediaPathname("22222222-2222-2222-2222-222222222222", pathname),
      false,
    );
    assert.equal(isOrgMediaPathname(orgId, `${pathname}/../secret`), false);
    assert.equal(/ocean sailing|adtriox/i.test(pathname), false);
  });

  it("only accepts common photo types and public Blob URLs", () => {
    assert.equal(isAllowedMediaImageType("image/png"), true);
    assert.equal(isAllowedMediaImageType("image/svg+xml"), false);
    assert.equal(isAllowedMediaImageType("application/pdf"), false);
    assert.equal(extensionForMediaType("image/webp"), ".webp");
    assert.equal(
      isVercelBlobImageUrl(
        "https://abc.public.blob.vercel-storage.com/org/one/builder/two.jpg",
      ),
      true,
    );
    assert.equal(isVercelBlobImageUrl("https://images.example.com/a.jpg"), false);
    assert.equal(isVercelBlobImageUrl("https://www.groovgro.com/w/x"), false);
    assert.equal(clipOriginalName("folder/hero photo.png"), "folder hero photo.png");
  });

  it("treats a store id as enough to say Blob is connected", () => {
    const previousToken = process.env.BLOB_READ_WRITE_TOKEN;
    const previousStore = process.env.BLOB_STORE_ID;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = "store_test";
    assert.equal(isBlobConfigured(), true);
    delete process.env.BLOB_STORE_ID;
    assert.equal(isBlobConfigured(), false);
    if (previousToken) process.env.BLOB_READ_WRITE_TOKEN = previousToken;
    if (previousStore) process.env.BLOB_STORE_ID = previousStore;
  });
});
