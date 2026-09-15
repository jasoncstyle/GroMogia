# What remains

Last updated: 15 September 2026.

This is the remaining-work map. Phases **A–T** first slices are already on `main`. Do not treat those letters as unfinished.

Product today: GroovGro watches, stores, and suggests. The owner decides. Live write, ads, email send, social post, Growth Director, and the website builder stay off until Jason asks **by name**.

Canonical intent: [MASTER_BRIEF.md](MASTER_BRIEF.md) §§15–19. Bot rules: [v2/BOT_TEAM.md](v2/BOT_TEAM.md). Live checkpoint: [STATUS.md](STATUS.md).

---

## Now — owner setup (no new code)

Do this on production after #332 is Ready.

1. Confirm **Organization → Refresh schedules** loads (not a 404).
2. Switch to **each** business. Set Search Console (and Analytics if connected) to Every day or Every week. Refresh buttons stay.
3. Confirm `CRON_SECRET` is set in Vercel Production (do not paste it into chat).
4. Leave Ocean Sailing Adventures Analytics disconnected until that site has a GA4 property. Then switch to that business and connect it.
5. Keep one desk token per organization. Do not mix brands on one SEOgro pack.

---

## Phase 1 — Finish the pipe (next product work)

GroovGro is the pipe. Bots GET, then POST. GroovGro does not wake bots. Do this before vendors, ads, or live write.

1. Put the stored **GA4** snapshot on `GET /api/bots/scout` (sessions, landing pages, sources already in GroovGro). SEOgro still must not log into Google.
2. Send **richer public pages** on the scout GET (description and headings are already stored; today the pack is mostly url / title / label).
3. Put saved Brand Voice **“more like this”** samples on DRAFTgro and WRITEgro GET.
4. Pull Search Console **links to you** (first-party backlinks GroovGro is allowed to read). Store them. Do not scrape Google.
5. Add a `content_brief` pack type on the SEOgro inbox if the bot needs to hand a brief, not only a page note.
6. When Jason has a Grok inbound URL, GroovGro may call the bots. Until then, bots keep asking GroovGro.

Walls: no OpenSERP, no Keyword Planner connect, no Ads scopes, no scrape, no `shipped` from a bot.

---

## Phase 2 — Owner-authorized apply

Paste-forever is not the product. Only GroovGro marks **shipped** after a real apply.

1. Turn on a **CMS publish adapter** only when Jason names the host (for example WordPress) and says to write.
2. GroovGro applies an approved pack to that connected site, then marks shipped.
3. Until that adapter is on, the owner still pastes, then marks it done.
4. Do not overwrite a connected live site from the GroovGro builder.

---

## Phase 3 — Licensed market file (only if Jason asks by name)

GroovGro already has **your** pile: Search Console, GA4, public pages, named competitor pages.

1. Licensed SERP adapter — only if Jason asks **by name**. Official or contracted. No scrape.
2. Optional: owner-pasted Keyword Planner **CSV**. Do not connect Google Ads.
3. Keyword groups, intent, and create-vs-improve — after a real store exists, not invented volume.
4. Cost caps before any paid vendor.

Do not install OpenSERP or any “free SERP API.”

---

## Phase 4 — AI visibility lookup (only if Jason asks by name)

Owner notes, a query library, history snapshots, and citation-gap estimates exist. Lookup stays off.

1. Confirm an official API, terms, and cost for one AI surface.
2. Turn on that adapter only. Store history. Do not treat one answer as truth.
3. Share of voice and live GEO audits wait until that adapter is honest.

Do not scrape ChatGPT, Gemini, Perplexity, or similar.

---

## Phase 5 — Attribution and Next step (later)

1. Keyword → page → person (from stored Search Console + site + named shares). Label DIRECT / ASSISTED / ESTIMATED / UNKNOWN.
2. AI-referral path — only after Phase 4 has a real adapter.
3. Use stored channel scores to **reorder** Next step only after Jason wants that. Today the estimate is shown and does not reorder.
4. Use a before-and-after look to change a plan — only with owner approval. No A/B traffic split yet.

---

## Phase 6 — Books (parked)

**BOOKSgro** waits. `/api/bots/books` stays 403.

1. Resume only when Jason asks and GroovGro is closer to books.
2. Read-only copies first. No invoices, no payments, no inventing balances.

---

## Phase 7 — Marketing send (parked)

Do not start these until Jason opens the door **by name**.

1. Ads (Google Ads / Meta). Execute stays off.
2. Email send (Resend campaign send).
3. Social post / schedule.
4. Growth Director and guarded automation.

---

## Phase 8 — Website builder (paused)

The builder exists. Do not add features until Jason asks.

1. Resume GroovGro-hosted pages only (not a clone of the live site).
2. Custom domains later.
3. Never overwrite a connected existing website.

---

## Do not

- Scrape Google or install OpenSERP
- Connect Keyword Planner / Ads scopes
- Let SEOgro log into Google
- Let DRAFTgro send or WRITEgro publish
- Hard-code sailing businesses
- Charge a card or touch stripe-osa
- Make Jason the permanent paste courier
- Skip to ads, builder, or autonomous AI because a list exists
