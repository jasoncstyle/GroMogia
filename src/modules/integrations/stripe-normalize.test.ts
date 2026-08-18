import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeStripeObject } from "./stripe-normalize";

describe("stripe payload mapping", () => {
  it("maps a checkout session to a payment without card fields", () => {
    const payment = normalizeStripeObject("checkout.session.completed", {
      id: "cs_test_123",
      amount_total: 12500,
      currency: "usd",
      customer_details: { email: "Pat@Example.com", name: "Pat Lee" },
      payment_status: "paid",
      created: 1_700_000_000,
      metadata: { organization_id: "org_a" },
      card: { number: "4242424242424242", cvc: "123" },
      source: { number: "4242424242424242" },
    });

    assert.ok(payment);
    assert.equal(payment.email, "pat@example.com");
    assert.equal(payment.displayName, "Pat Lee");
    assert.equal(payment.amountCents, 12500);
    assert.equal(payment.kind, "charge");
    assert.equal(payment.providerObjectId, "cs_test_123");
    assert.equal("card" in payment, false);
    assert.equal(JSON.stringify(payment).includes("4242"), false);
    assert.equal(JSON.stringify(payment).includes("cvc"), false);
  });

  it("maps a refund without storing PAN", () => {
    const payment = normalizeStripeObject("charge.refunded", {
      id: "ch_test_9",
      amount: 5000,
      amount_refunded: 5000,
      currency: "usd",
      billing_details: { email: "pat@example.com" },
      created: 1_700_000_100,
    });

    assert.ok(payment);
    assert.equal(payment.kind, "refund");
    assert.equal(payment.providerObjectId, "ch_test_9:refund");
    assert.equal(payment.amountCents, 5000);
  });

  it("ignores unrelated Stripe events", () => {
    assert.equal(
      normalizeStripeObject("customer.created", { id: "cus_1" }),
      null,
    );
  });
});
