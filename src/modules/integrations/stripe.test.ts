import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { isStripeWebhookConfigured, webhookSigningSecrets } from "./stripe";

const original = {
  secret: process.env.STRIPE_SECRET_KEY,
  testWebhook: process.env.STRIPE_WEBHOOK_SECRET,
  liveWebhook: process.env.STRIPE_LIVE_WEBHOOK_SECRET,
};

afterEach(() => {
  if (original.secret === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = original.secret;
  if (original.testWebhook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = original.testWebhook;
  if (original.liveWebhook === undefined) delete process.env.STRIPE_LIVE_WEBHOOK_SECRET;
  else process.env.STRIPE_LIVE_WEBHOOK_SECRET = original.liveWebhook;
});

describe("stripe webhook secrets", () => {
  it("accepts both the test and live signing secrets", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_LIVE_WEBHOOK_SECRET = "whsec_live";
    assert.deepEqual(webhookSigningSecrets(), ["whsec_test", "whsec_live"]);
  });

  it("is configured when only the live webhook secret is present", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_LIVE_WEBHOOK_SECRET = "whsec_live";
    assert.equal(isStripeWebhookConfigured(), true);
  });

  it("is not configured without a Stripe key", () => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    assert.equal(isStripeWebhookConfigured(), false);
  });
});
