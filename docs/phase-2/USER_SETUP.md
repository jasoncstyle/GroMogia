# Phase 2 — Stripe and website setup

Phase 1 sign-in and the database are already live. Phase 2 adds website tracking, leads, events, and Stripe bookings. Do this in the browser. Do not install Stripe or a database on your computer.

Project: **gro-mogia** at [https://vercel.com/dashboard](https://vercel.com/dashboard)  
Live app: [https://gro-mogia.vercel.app](https://gro-mogia.vercel.app)

Use **test keys** first. GroovGro never stores card numbers.

## 1. Add Stripe test keys in Vercel

1. Open [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) while **Test mode** is on (toggle in the Stripe dashboard).
2. Copy the **Secret key** (starts with `sk_test_`).
3. Copy the **Publishable key** (starts with `pk_test_`).
4. Open the **gro-mogia** project in Vercel.
5. Go to **Settings → Environment Variables**.
6. Add these names for **Production** and **Preview**:
   - `STRIPE_SECRET_KEY` = the `sk_test_` value
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = the `pk_test_` value
7. Leave `STRIPE_WEBHOOK_SECRET` for the next section.

Do not paste these values into GitHub, Cursor chat, or a file in the repo.

## 2. Add the webhook

Stripe needs a public URL on Vercel. Cursor cannot receive webhooks.

1. In Stripe, open [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks).
2. Click **Add endpoint**.
3. Endpoint URL: `https://gro-mogia.vercel.app/api/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `charge.succeeded`
   - `charge.refunded`
5. Save the endpoint.
6. Open the endpoint and reveal **Signing secret** (starts with `whsec_`).
7. In Vercel **Settings → Environment Variables**, add:
   - `STRIPE_WEBHOOK_SECRET` = the `whsec_` value
   - Environments: **Production** and **Preview**

Preview deployments have different URLs. The production webhook above is enough for the live app. You can add a second Stripe endpoint later for a Preview URL if you need to test a pull request.

## 3. Redeploy

1. In Vercel, open **Deployments**.
2. On the latest Production deployment, click the **⋯** menu → **Redeploy**.
3. Turn **Use existing Build Cache** **off**.
4. Redeploy.

`NEXT_PUBLIC_` values are baked in at build time. A cache-off redeploy is required after adding them.

## 4. Connect Stripe inside GroovGro

1. Open [https://gro-mogia.vercel.app/app](https://gro-mogia.vercel.app/app) and sign in.
2. Open **Integrations** or **Bookings & payments**.
3. Click **Connect Stripe**.
4. Click **Sync recent Stripe activity** if you already have test checkouts or charges.

If only one organization exists, incoming webhooks go there. If you later have more than one organization, put `organization_id` in the Stripe Checkout Session metadata so GroovGro knows which business the payment belongs to.

## 5. Connect the existing website

1. In GroovGro, open **Website connection**.
2. Paste the public website address.
3. Save. Saving the address does not read the pages.
4. Open **Next step**. Click **Find pages**, check the important ones, then click **Review connected data**. GroovGro does not change the live site. Open **Business** later if you want to run Review again.
5. Copy the tracking snippet on **Website connection** and paste it before the closing `</body>` tag on that site. Keep that page open while you do it.
6. Share the public lead form link on **Website connection**, or on **Next step** when GroovGro asks.

This does **not** overwrite the connected website. The website builder stays paused.

**How updates work:** GroovGro can check the site and draft changes. If you later use the GroovGro builder, WordPress, or a similar official connection, approved updates can be applied automatically. Otherwise you copy the change onto the connected site yourself. Each SEO draft says what to change and where.

## 6. Attach groovgro.com (after this rename is on Production)

The Vercel project is still named **gro-mogia**. You do not have to rename the project.

1. Open the **gro-mogia** project in Vercel.
2. Left sidebar → **Domains**.
3. Add `groovgro.com` and `www.groovgro.com`. Follow Vercel’s DNS instructions at the registrar where you bought the domain.
4. In Clerk, add `https://groovgro.com` and `https://www.groovgro.com` as allowed origins / redirect URLs, same as you did for `https://gro-mogia.vercel.app`.
5. In Vercel **Environment Variables**, set `NEXT_PUBLIC_APP_URL` = `https://groovgro.com` (Production and Preview).
6. **Deployments → Redeploy** with **Use existing Build Cache** off.
7. Keep the existing Stripe **test** webhook on `https://gro-mogia.vercel.app/api/stripe/webhook`. After the domain works, **add** a second **test** endpoint `https://www.groovgro.com/api/stripe/webhook`. Put that destination’s signing secret in `STRIPE_WEBHOOK_SECRET`. Do not delete or edit the Ocean Sailing Adventures **live** webhook.

## 7. Add a GroovGro Live webhook later (extra destination)

Do this only after groovgro.com already receives **test** payments. GroovGro keeps using **test** API keys. Live events need a second signing secret.

1. Merge the “live extra webhook” code to Production and wait until that deploy is Ready.
2. In Stripe, switch from sandbox/test to **Live**.
3. Open the Live webhook / event destination list. Screenshot it before clicking anything.
4. Find the Ocean Sailing Adventures live destination. **Do not click, edit, or delete it.**
5. Click **Add destination**.
6. Endpoint URL: `https://www.groovgro.com/api/stripe/webhook`
7. Name: `GroovGro live`
8. Same four events as test: `checkout.session.completed`, `payment_intent.succeeded`, `charge.succeeded`, `charge.refunded`
9. Save.
10. Copy the new Live signing secret (`whsec_`). Do not paste it into chat.
11. In Vercel **gro-mogia** → **Settings** → **Environment Variables**, **add** a new variable:
    - Name: `STRIPE_LIVE_WEBHOOK_SECRET`
    - Value: the Live `whsec_`
    - Environments: Production and Preview
12. Do **not** change `STRIPE_SECRET_KEY` (keep `sk_test_`).
13. Do **not** change `STRIPE_WEBHOOK_SECRET` (keep the test secret).
14. **Deployments → Redeploy** the latest Production deploy with **Use existing Build Cache** off.
15. Switch Stripe back to sandbox/test when you are done.

Live Ocean Sailing Adventures payments can then appear in GroovGro **Jason's Test** next to the test $5/$10 rows. That is expected until there is a separate organization. One real payment may still show as more than one GroovGro row (payment intent + charge).

## What you should see

After a test payment or a form submit:

- The dashboard shows lead, customer, and payment counts.
- **Leads & customers** lists the person once. A paying customer is the same person, not a second record.
- **Bookings & payments** lists the Stripe amount and ID, never a card number.

## Not yet

Ads, AI that executes without approval, and the GroovGro website builder wait for later phases.
