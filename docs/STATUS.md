# Build status

Last updated: 20 August 2026.

**Product name:** GroovGro (formerly GroMogia)  
**Product domain:** groovgro.com  
**Parent company:** Mogia Group · mogiagroup.com  
**Live app today:** https://www.groovgro.com  
**Vercel project (unchanged until renamed in Vercel):** gro-mogia  
**GitHub repo (unchanged until renamed on GitHub):** https://github.com/jasoncstyle/GroMogia

## Current phase

**Phase 3 — marketing / attribution**, first slice.

Do not start ads, SEO, the website builder, or autonomous AI.

## What is already working (Phase 2)

- Homepage is Coming soon; the app is at `/app`
- Sign-in shows GroovGro
- Jason's Test: website, snippet, public lead form, events, dashboard
- Stripe **sandbox** GroovGro test webhook on the personal-email **Coastal Sailing Adventures LLC** account
- Stripe **Live** GroovGro live webhook is an extra destination on **Ocean Sailing Adventures**, beside **stripe-osa endpoint**. The sailing checkout for bunks is unchanged.
- GroovGro keeps `sk_test_` keys. Live events use `STRIPE_LIVE_WEBHOOK_SECRET`.

## Stripe accounts (do not mix)

| Login | Stripe account | Use |
| --- | --- | --- |
| Personal email | Coastal Sailing Adventures LLC | GroovGro test webhooks |
| Ocean Sailing Adventures | Ocean Sailing Adventures | Live sailing payments. **stripe-osa endpoint** stays. GroovGro live is extra. |

## This Phase 3 slice

Marketing page: source → visits → leads → customers → revenue (Stripe `ch_` charges only, so one checkout is not triple-counted). Snippet remembers UTM on the connected site.

## Still later

Phase 4 intelligence, 5 brand voice, 6 SEO, 7 website builder, 8 more integrations, 9 AI execute, 10 commercialization.
