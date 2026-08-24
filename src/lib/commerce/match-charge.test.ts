import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isUnmatchedPaymentCopy, labelForMatchedPerson } from "./match-charge";

describe("match charge copies", () => {
  it("treats a payment with no person as unmatched", () => {
    assert.equal(isUnmatchedPaymentCopy({ contactId: null }), true);
    assert.equal(isUnmatchedPaymentCopy({ contactId: "person-1" }), false);
  });

  it("labels a person with name and email for the Bookings picker", () => {
    assert.equal(
      labelForMatchedPerson({
        displayName: "Alex Rivera",
        email: "alex@example.com",
      }),
      "Alex Rivera (alex@example.com)",
    );
    assert.equal(
      labelForMatchedPerson({ displayName: "Alex Rivera", email: null }),
      "Alex Rivera",
    );
    assert.equal(
      labelForMatchedPerson({ displayName: "  ", email: "alex@example.com" }),
      "alex@example.com",
    );
  });

  it("keeps matching on Bookings and does not change checkout", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/commerce/page.tsx"),
      "utf8",
    );
    assert.match(page, /MatchChargeForm/);
    assert.match(page, /isUnmatchedPaymentCopy/);
    assert.match(page, /never stores card/);
    assert.doesNotMatch(page, /stripe-osa/);
    assert.doesNotMatch(page, /Open Website builder/);

    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/commerce.ts"),
      "utf8",
    );
    assert.match(action, /matchPaymentToPerson/);
    assert.match(action, /will not charge a card/);
    assert.doesNotMatch(action, /stripe\.charges/);
    assert.doesNotMatch(action, /checkout\.sessions/);
  });
});
