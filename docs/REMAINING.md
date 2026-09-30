# What remains

Last updated: 30 September 2026.

Product intent: [MASTER_BRIEF.md](MASTER_BRIEF.md) (V3). Audit: [v2/PHASE_0_AUDIT.md](v2/PHASE_0_AUDIT.md). Fences: [v2/V2_AMENDMENTS.md](v2/V2_AMENDMENTS.md). Internal workers: [v2/BOT_TEAM.md](v2/BOT_TEAM.md). Live checkpoint: [STATUS.md](STATUS.md).

The V2.2 A–T first slices are already on `main`. Do not treat those letters as unfinished. Do not add listed-first polish to the old console.

---

## Now — owner decision (no UI rewrite)

Accept or correct the four Phase 0 decisions in [STATUS.md](STATUS.md). Until that happens, do not build the five-screen shell.

Owner setup that can still happen on production:

1. Confirm Organization → Refresh schedules loads.
2. Set Search Console (and Analytics if connected) per business to every day or every week.
3. Confirm `CRON_SECRET` is set in Vercel Production (do not paste it into chat).
4. Leave a business disconnected from Analytics until that site has a GA4 property.
5. Keep one desk token per organization. Do not mix brands on one SEOgro pack.

---

## After Phase 0 accept — V3 Phase 1 (next product work)

New owner surface over existing data. No wipe. No live write.

1. Home / Grow / Work / Results / Business shell. Old routes redirect.
2. Home: pulse, one Best Next Move, GroovGro is working, recent win, today.
3. Grow: today’s Next step coordinator + Watching.
4. Work: Working / Needs you / Finished. Hide bot names.
5. Results: measured vs estimated vs unknown.
6. Business: Brain, Offers, Voice, Goals, What we’ve learned.
7. Action Ledger fields on `growth_actions` only when a slice needs them.
8. Worker Gateway wrapping existing scout / draft / write routes.
9. Contextual chat that explains and navigates. No state-changing commands yet.
10. Mobile approval / status.

Walls: no OpenSERP, no Keyword Planner connect, no Ads scopes, no scrape, no `shipped` from a bot, no CMS write, no execute.

---

## Still later — pipe, apply, licensed intel

These stay after the shell, and still need Jason to ask **by name** where noted.

1. Put the stored **GA4** snapshot on `GET /api/bots/scout`. SEOgro must not log into Google.
2. Richer public pages on the scout GET.
3. Brand Voice “more like this” samples on DRAFTgro and WRITEgro GET.
4. Search Console **links to you** (first-party). Do not scrape Google.
5. CMS publish adapter only when Jason names the host and says to write. Until then the owner pastes and marks done.
6. Licensed SERP adapter — only if Jason asks by name. No OpenSERP.
7. Optional owner-pasted Keyword Planner CSV. Do not connect Google Ads.
8. GEO lookup — only with an official API. Do not scrape AI systems.
9. Reorder Grow from channel scores only after Jason wants that.
10. BOOKSgro stays 403 until Jason asks.
11. Ads, email send, social post, Growth Director — parked until Jason opens the door by name.
12. Website builder stays paused. Never overwrite a connected live site.

---

## Do not

- Begin the V3 shell before Phase 0 is accepted
- Wipe Neon, Clerk, or Vercel
- Scrape Google or install OpenSERP
- Connect Keyword Planner / Ads scopes
- Let SEOgro log into Google
- Let DRAFTgro send or WRITEgro publish
- Hard-code sailing businesses
- Charge a card or touch stripe-osa
- Make Jason the permanent paste courier
- Skip to ads, builder, or autonomous AI because a list exists
- Add more listed-first / remaining-count copy on the old console
