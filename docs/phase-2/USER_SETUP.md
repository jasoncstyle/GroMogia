# Phase 2 — Stripe and website setup

Phase 1 sign-in and the database are already live. Phase 2 adds website tracking, leads, events, and Stripe bookings. Do this in the browser. Do not install Stripe or a database on your computer.

Project: **gro-mogia** at [https://vercel.com/dashboard](https://vercel.com/dashboard)  
Live app: [https://gro-mogia.vercel.app](https://gro-mogia.vercel.app)

Use **test keys** first. GroMogia never stores card numbers.

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

## 4. Connect Stripe inside GroMogia

1. Open [https://gro-mogia.vercel.app/app](https://gro-mogia.vercel.app/app) and sign in.
2. Open **Integrations** or **Bookings & payments**.
3. Click **Connect Stripe**.
4. Click **Sync recent Stripe activity** if you already have test checkouts or charges.

If only one organization exists, incoming webhooks go there. If you later have more than one organization, put `organization_id` in the Stripe Checkout Session metadata so GroMogia knows which business the payment belongs to.

## 5. Connect the existing website

1. In GroMogia, open **Website connection**.
2. Paste the public website address (SiteGround, WordPress, or other).
3. Save.
4. Copy the tracking snippet and paste it before the closing `</body>` tag on that site.
5. Share the public lead form link shown on the same page.

This does **not** build a new website. The website builder is a later phase.

## What you should see

After a test payment or a form submit:

- The dashboard shows lead, customer, and payment counts.
- **Leads & customers** lists the person once. A paying customer is the same person, not a second record.
- **Bookings & payments** lists the Stripe amount and ID, never a card number.

## Not yet

Custom domain `gromogia.com`, ads, SEO, AI automation, and the GroMogia website builder wait for later phases.
