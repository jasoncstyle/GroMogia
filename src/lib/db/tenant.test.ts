import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertSameOrganization, scoped } from "./tenant";

describe("tenant isolation", () => {
  it("allows matching organization ids", () => {
    assert.doesNotThrow(() =>
      assertSameOrganization("org_a", "org_a"),
    );
  });

  it("rejects cross-tenant access", () => {
    assert.throws(() => assertSameOrganization("org_a", "org_b"));
  });

  it("filters rows to the active organization", () => {
    const rows = scoped(
      [
        { organizationId: "org_a", name: "A" },
        { organizationId: "org_b", name: "B" },
      ],
      "org_a",
    );
    assert.deepEqual(rows, [{ organizationId: "org_a", name: "A" }]);
  });
});
