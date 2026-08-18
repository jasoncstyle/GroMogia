import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasPermission, ROLE_PERMISSIONS } from "./permissions";

describe("RBAC", () => {
  it("gives owners every permission", () => {
    assert.equal(
      hasPermission(ROLE_PERMISSIONS.owner, "manage_billing"),
      true,
    );
  });

  it("does not let viewers manage users", () => {
    assert.equal(hasPermission(ROLE_PERMISSIONS.viewer, "manage_users"), false);
  });

  it("does not treat missing grants as allowed", () => {
    assert.equal(hasPermission([], "view_financials"), false);
  });
});
