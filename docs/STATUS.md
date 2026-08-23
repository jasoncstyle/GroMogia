# Build status

Last updated: 23 August 2026.

## V1 checkpoint (do not mix with V2)

GitHub tag **`pre-v2-architecture-checkpoint`** on `main` is the last known-good V1 / early-build snapshot. Commit `7d4c9be` — *Add background colors to the GroovGro header and footer. (#45)*.

Use that tag to compare, roll back, or see what V2 actually changed. Do not start V2 architecture edits on `main`. Current V2 work is on `cursor/v2-discovery-a329`.

**Product name:** GroovGro (formerly GroMogia)  
**Product domain:** groovgro.com  
**Parent company:** Mogia Group · mogiagroup.com  
**Live app today:** https://www.groovgro.com  
**Vercel project (unchanged until renamed in Vercel):** gro-mogia  
**GitHub repo (unchanged until renamed on GitHub):** https://github.com/jasoncstyle/GroMogia

## Current phase

**V2 growth foundation + discovery + reviews.** Business Brain, Offers, constraints, Goals, Decision History, review-from-connected-data, and weekly/monthly Growth Reviews. GroovGro can draft Offers and suggested Goals from events, bookings, and payments. Drafts stay inactive until you confirm. Reviews can recommend leaving the plan alone. Website builder and all earlier V1 modules stay as they were.

V1 on `main` remains Phase 7 website builder until this branch is merged. Public groovgro.com homepage stays Coming soon.

Do not start ads, Growth Director execution, or autonomous AI. Custom domains for builder sites wait. Do not write groovgro.com robots.txt or sitemap.xml for tenant pages.

## Stripe (do not mix, do not replace)

Ocean Sailing Adventures **live** bunk/passage checkout still uses **stripe-osa endpoint**. GroovGro only **reads a copy** of those events. It never charges a card and never replaces checkout.

## What is already working

- Website, snippet, public lead form, events, CRM, dashboard
- Marketing attribution and Intelligence (observe + recommend)
- Brand voice: profile, examples, drafts that stay in GroovGro
- SEO: connected homepage check, GroovGro checks for Home and every extra page, drafts, score history, plain-language explanation, Search Console read-only
- Website builder: visual GroovGro-hosted pages at `/w/[org]` (Home) and `/w/[org]/[slug]` (extra pages)
- Approved SEO title, description, and heading drafts can be applied to the matching GroovGro page
- V2 foundation screens: Business, Offers, Goals, Decisions (Preview of this branch; production after merge)
- Review connected data: draft Offers and suggested Goals from events, bookings, and payments; confirm or reject before anything becomes active
- Goal progress from connected leads, bookings, and payments; optional Offer/Goal links on events and leads
- Weekly Growth Review and monthly strategy review from connected evidence, including “no change yet”

## Still later

Richer website-page discovery, persisted goal progress writes, specialist READ/ANALYZE/RECOMMEND (no execute), Growth Director, builder custom domains, WordPress write adapter, Phase 8 integrations (including Google Ads), guarded automation, commercialization.
