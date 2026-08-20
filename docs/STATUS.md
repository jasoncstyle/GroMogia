# Build status

Last updated: 20 August 2026.

**Product name:** GroovGro (formerly GroMogia)  
**Product domain:** groovgro.com  
**Parent company:** Mogia Group · mogiagroup.com  
**Live app today:** https://www.groovgro.com  
**Vercel project (unchanged until renamed in Vercel):** gro-mogia  
**GitHub repo (unchanged until renamed on GitHub):** https://github.com/jasoncstyle/GroMogia

## Current phase

**Phase 4 — intelligence**, first slice (observe + recommend only).

Do not start ads, SEO, the website builder, brand voice, or autonomous AI.

## Stripe (do not mix, do not replace)

Ocean Sailing Adventures **live** bunk/passage checkout still uses **stripe-osa endpoint**. GroovGro only **added** a second Live destination. GroovGro never charges a card and never replaces that checkout.

| Login | Stripe account | Use |
| --- | --- | --- |
| Personal email | Coastal Sailing Adventures LLC | GroovGro **test** webhooks |
| Ocean Sailing Adventures | Ocean Sailing Adventures | Live sailing payments. **stripe-osa endpoint** stays. GroovGro live is extra. |

GroovGro keeps `sk_test_` keys. Live events use `STRIPE_LIVE_WEBHOOK_SECRET`.

## What is already working

- Homepage is Coming soon; the app is at `/app`
- Jason's Test: website, snippet, public lead form, events, dashboard
- Marketing: source → visits → leads → customers → revenue (`ch_` charges only)
- Intelligence: observations and recommended next steps from those records. No email, ads, website edits, or payments.

## Still later

Phase 5 brand voice, 6 SEO, 7 website builder, 8 more integrations, 9 AI execute, 10 commercialization.
