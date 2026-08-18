import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scoped } from "@/lib/db/tenant";

import {
  assertTenantContact,
  contactStates,
  convertingLeadCreatesCustomerNotPerson,
  displayNameFrom,
  matchExistingContact,
  normalizeEmail,
} from "./identity";

describe("contact identity", () => {
  it("treats the same email in one organization as one person", () => {
    const existing = [
      {
        id: "c1",
        organizationId: "org_a",
        email: "pat@example.com",
        displayName: "Pat",
        phone: null,
      },
    ];

    const match = matchExistingContact(existing, {
      email: "Pat@Example.com",
      displayName: "Patricia",
    });

    assert.equal(match?.id, "c1");
    assert.equal(normalizeEmail("Pat@Example.com"), "pat@example.com");
  });

  it("does not merge people across organizations even with the same email", () => {
    const rows = [
      {
        id: "c1",
        organizationId: "org_a",
        email: "pat@example.com",
        displayName: "Pat A",
        phone: null,
      },
      {
        id: "c2",
        organizationId: "org_b",
        email: "pat@example.com",
        displayName: "Pat B",
        phone: null,
      },
    ];

    const tenantRows = scoped(rows, "org_a");
    const match = matchExistingContact(tenantRows, {
      email: "pat@example.com",
    });

    assert.equal(match?.id, "c1");
    assert.equal(match?.organizationId, "org_a");
  });

  it("keeps lead and customer as states of one contact", () => {
    const states = contactStates({
      openLeadCount: 1,
      hasCustomerRecord: true,
    });
    assert.equal(states.isLead, true);
    assert.equal(states.isCustomer, true);

    const conversion = convertingLeadCreatesCustomerNotPerson({
      contactId: "c1",
      existingCustomerContactIds: [],
    });
    assert.equal(conversion.contactId, "c1");
    assert.equal(conversion.createdNewPerson, false);
  });

  it("rejects cross-tenant contact use", () => {
    assert.throws(() =>
      assertTenantContact({ organizationId: "org_a" }, "org_b"),
    );
  });

  it("falls back to the email local part when no name is given", () => {
    assert.equal(displayNameFrom({ email: "pat@example.com" }), "pat");
  });
});
