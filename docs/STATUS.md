# Build status

Last updated: 23 August 2026.

## V1 checkpoint (do not mix with V2)

GitHub tag **`pre-v2-architecture-checkpoint`** on `main` is the last known-good V1 / early-build snapshot. Commit `7d4c9be` — *Add background colors to the GroovGro header and footer. (#45)*.

Use that tag to compare, roll back, or see what V2 actually changed. Do not start V2 architecture edits on `main`. V2 review work belongs on `cursor/v2-architecture-review-a329` after the new master plan is in hand.

**Product name:** GroovGro (formerly GroMogia)  
**Product domain:** groovgro.com  
**Parent company:** Mogia Group · mogiagroup.com  
**Live app today:** https://www.groovgro.com  
**Vercel project (unchanged until renamed in Vercel):** gro-mogia  
**GitHub repo (unchanged until renamed on GitHub):** https://github.com/jasoncstyle/GroMogia

## Current phase

**Phase 7 — Website builder (V1 baseline).** Full-page editor with preview (not live), numbered starter layouts (white with dark grey text), a color wheel plus hex and swatches, extra GroovGro pages, SEO checks for every GroovGro page, photo uploads to Vercel Blob, one-level inner rows inside a column, and a site-wide header and footer (edit on Home, including header/footer colors). Publish per page. Home cannot be deleted. Does not replace a connected existing website. Does not change Stripe checkout. Public groovgro.com homepage stays Coming soon.

V2 architecture review has not started. No V2 code changes yet.

Do not start ads or autonomous AI. Custom domains for builder sites wait. Do not write groovgro.com robots.txt or sitemap.xml for tenant pages.

## Stripe (do not mix, do not replace)

Ocean Sailing Adventures **live** bunk/passage checkout still uses **stripe-osa endpoint**. GroovGro only **reads a copy** of those events. It never charges a card and never replaces checkout.

## What is already working

- Website, snippet, public lead form, events, CRM, dashboard
- Marketing attribution and Intelligence (observe + recommend)
- Brand voice: profile, examples, drafts that stay in GroovGro
- SEO: connected homepage check, GroovGro checks for Home and every extra page, drafts, score history, plain-language explanation, Search Console read-only
- Website builder: visual GroovGro-hosted pages at `/w/[org]` (Home) and `/w/[org]/[slug]` (extra pages), with a labeled starting template, full-page editor, draft preview, per-row width, white/dark-grey defaults, a color wheel plus hex and swatches, extra widgets, pasted photos fetched by GroovGro, photos uploaded to Vercel Blob, one-level inner rows inside a column, and a site-wide header and footer that you edit on Home
- Approved SEO title, description, and heading drafts can be applied to the matching GroovGro page

## Still later

Builder custom domains, WordPress write adapter, Phase 8 integrations (including Google Ads), 9 AI execute, 10 commercialization.
