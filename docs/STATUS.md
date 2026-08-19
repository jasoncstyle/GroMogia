# Build status

Last updated: 19 August 2026.

**Product name:** GroovGro (formerly GroMogia)  
**Product domain:** groovgro.com (purchased; not yet attached to Vercel)  
**Parent company:** Mogia Group · mogiagroup.com  
**Live app today:** https://gro-mogia.vercel.app  
**Vercel project (unchanged until renamed in Vercel):** gro-mogia  
**GitHub repo (unchanged until renamed on GitHub):** https://github.com/jasoncstyle/GroMogia

## Current phase

**Phase 2 — first real business data**, in progress.

Do not start Phase 3 (marketing / attribution), the website builder, ads, SEO, or autonomous AI until Phase 2 is accepted.

## What is already working

- Phase 0 architecture and Phase 1 foundation (sign-in, organizations, brand, modules)
- Jason can sign in and use **Jason's Test**
- Stripe **test mode** connected; test payments and bookings show (about $30, 1 customer)
- Ocean Sailing Adventures site connected: https://www.oceansailingadventures.com/
- That public site runs on **Vercel / Next.js**, not SiteGround. SiteGround File Manager `Default.html` is not what visitors see
- Tracking snippet is on the live sailing site
- Visits record in **Analytics** after the beacon was pointed at GroovGro (PR #9)
- Contacts = one person; lead and customer are states of that person
- Card numbers are never stored

## What was next when the rename started

1. Submit a **test lead** on the public form (`/l/...`) with a fake email that is not the Stripe test customer
2. Add one **generic event** (class / training date — not a sailing-only table)
3. Confirm the dashboard answers: what is happening, why, what needs attention, what to do next
4. Later: live Stripe keys **as an extra webhook**, without editing the existing Ocean Sailing Adventures live webhook

## Still later

Phase 3 marketing, 4 intelligence, 5 brand voice, 6 SEO, 7 website builder, 8 more integrations, 9 AI execute, 10 commercialization.

## What this rename does not change by itself

Clerk, Neon, Stripe secrets, the Vercel project slug, and the GitHub repo name stay as they are until those dashboards are updated. After merge, add `groovgro.com` in Vercel **Domains**, then Clerk allowed origins, then set `NEXT_PUBLIC_APP_URL` to `https://groovgro.com` and redeploy with build cache off. See [docs/phase-2/USER_SETUP.md](phase-2/USER_SETUP.md).
