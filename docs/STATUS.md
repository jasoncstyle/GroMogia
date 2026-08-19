# Build status

Last updated: 19 August 2026.

**Product name:** GroovGro (formerly GroMogia)  
**Product domain:** groovgro.com  
**Parent company:** Mogia Group · mogiagroup.com  
**Live app today:** https://www.groovgro.com  
**Vercel project (unchanged until renamed in Vercel):** gro-mogia  
**GitHub repo (unchanged until renamed on GitHub):** https://github.com/jasoncstyle/GroMogia

## Current phase

**Phase 2 — first real business data**, accepted for the test workspace.

Do not start Phase 3 (marketing / attribution), the website builder, ads, SEO, or autonomous AI.

## What is already working

- Sign-in shows GroovGro; Clerk application name was renamed
- Jason can sign in and use **Jason's Test**
- Website connected: https://www.oceansailingadventures.com/
- Tracking visits record in Analytics
- Public lead form creates a lead
- Generic events save, with a confirmation popup
- Dashboard answers the four questions from real data
- Stripe **sandbox/test** webhook on `https://www.groovgro.com/api/stripe/webhook` (destination name GroovGro test)
- Test payments appear in Bookings & payments. One checkout can show as more than one row (payment intent + charge). Card numbers are never stored.

## Next

Add a **Live** Stripe destination for GroovGro as an extra webhook, without editing or deleting the Ocean Sailing Adventures live webhook. GroovGro keeps test API keys. Put the Live signing secret in `STRIPE_LIVE_WEBHOOK_SECRET` only after the matching code is on Production.

## Still later

Phase 3 marketing, 4 intelligence, 5 brand voice, 6 SEO, 7 website builder, 8 more integrations, 9 AI execute, 10 commercialization.
