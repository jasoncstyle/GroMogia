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

  it("lets owners create goals and view decision history", () => {
    assert.equal(hasPermission(ROLE_PERMISSIONS.owner, "create_goals"), true);
    assert.equal(
      hasPermission(ROLE_PERMISSIONS.owner, "view_decision_history"),
      true,
    );
  });

  it("does not let viewers change goals or automation", () => {
    assert.equal(hasPermission(ROLE_PERMISSIONS.viewer, "create_goals"), false);
    assert.equal(
      hasPermission(ROLE_PERMISSIONS.viewer, "configure_automation"),
      false,
    );
  });
});
