# Phase 0 — Repository audit

**Date:** 30 September 2026  
**Commit audited:** `0346212` on `main` (*List remaining phases after A–T first slices*)  
**Decision:** do **not** wipe the repo, Neon, Clerk, or Vercel. Restart the **owner experience**. Keep the store.

This audit exists so Jason can accept or correct the keep / refactor / rebuild map **before** any major V3 UI coding. Do not begin the Home / Grow / Work / Results / Business shell until [STATUS.md](../STATUS.md) says Phase 0 is accepted.

Source plan: Jason’s GroovGro V2 Master Plan (30 September 2026). Binding fences: [V2_AMENDMENTS.md](V2_AMENDMENTS.md). New brief: [MASTER_BRIEF.md](../MASTER_BRIEF.md) (V3).

---

## Owner decisions (accept or correct)

1. **Keep the data and integrations.** Do not restart from an empty app.
2. **Replace the owner surface.** Five primary screens. Hide bot names, desk tokens, and listed-first factory copy from normal use.
3. **Accept the amendments.** Observe / recommend / prepare only until Jason names a connector. No scrape. No ads. No email send. No live-site write.
4. **After accept:** first coding slice is the new shell over existing `growth_actions`, Next step, Brain, and Voice — not a new database.

If any of those four is wrong, say so before UI work starts.

---

## What the product is today

GroovGro on `main` is a working **multi-tenant marketing assistant** with a large **SEO operations console** on top.

It already connects, stores, and suggests. It does not execute.

The owner experience does not match the new plan. There are roughly twenty sidebar items. Dashboard is a visual desk of charts and alerts. SEO, Intelligence, Next step, Your work, Bot team, and Search desk all compete. Copy talks about remaining counts, listed-first groups, SEOgro, and workflow leftovers. A pottery-studio or sailing-school owner cannot pass the 10-second test.

The backend is further along than the clothes suggest. That is why a wipe is the wrong move.

---

## Inventory — owner screens

| Screen | Route | Verdict |
| --- | --- | --- |
| Dashboard | `/app` | **Replace** as Home. Keep the data it already loads (Goal, next step, alerts, leads, payments). Drop visual-desk chrome as the product. |
| Next step | `/app/next-step` | **Refactor** into Grow → Best Next Move. Logic in `src/lib/growth/next-step.ts` is reusable. |
| Your work | `/app/work` | **Refactor** into Work → Needs you / Finished. |
| Intelligence | `/app/intelligence` | **Refactor** fragments into Home pulse, Grow watching, and Results. Do not keep it as a second dashboard. |
| SEO / Search desk | `/app/seo` | **Replace** as an owner product. Keep reads, drafts, and proposals as Work evidence. Hide scout inbox jargon. |
| Bot team | `/app/bot-team` | **Replace** as an owner screen. Move to Settings → advanced / developer. Owner sees “GroovGro is working.” |
| Business | `/app/business` | **Keep** as the Business screen core. Expand with Voice, Goals, and What we’ve learned. |
| Brand voice | `/app/brand-voice` | **Refactor** into Business → Brand. Generation stays A2 (draft only). |
| Offers | `/app/offers` | **Refactor** into Business → Products & services. |
| Goals | `/app/goals` | **Refactor** into Business → Goals. Progress snapshots stay. |
| Growth review | `/app/growth-review` | **Refactor** into the weekly GroovGro Brief / Results. |
| Website connection | `/app/website` | **Keep** (read-only). Settings / Business detail. |
| Analytics | `/app/analytics` | **Keep** ingestion. Owner summary on Results. Tables in detail. |
| Marketing | `/app/marketing` | **Keep** named shares. Results / Settings detail. |
| Bookings & payments | `/app/commerce` | **Keep** Stripe copies. Do not charge cards. Do not touch stripe-osa. |
| Leads & customers | `/app/crm` | **Keep**. Work / Results detail. |
| Events | `/app/events` | **Keep**. Not the V3 home. |
| Integrations | `/app/integrations` | **Keep** in Settings. |
| Organization / team / schedules / add business | `/app/settings/*` | **Keep**. Refresh scheduler stays. |
| Website builder | `/app/website-builder` | **Park.** Resume only if Jason asks. Never overwrite a connected live site. |
| Media, audit, notifications | `/app/media`, `/app/audit`, `/app/notifications` | **Keep** in Settings / advanced. |
| Decisions | `/app/decisions` | **Refactor** into Growth Memory on Business / Results. |

Primary navigation today (sidebar): Dashboard, Next step, Offers, Website, Events, CRM, Commerce, Builder, Goals, Growth review, Your work, Analytics, Marketing, Intelligence, Brand voice, SEO, plus Settings (Brand, Business, Integrations, Media, Bot team, Organization, Audit, Notifications). That fails the 10-second rule.

Target navigation: **Home | Grow | Work | Results | Business**. Ask GroovGro globally. Settings holds complexity.

---

## Inventory — reusable backend

### Keep as-is (sound)

| Area | Where | Why |
| --- | --- | --- |
| Auth / tenants | Clerk, `organizations`, `users`, `memberships`, RBAC | Isolation already works. One business open at a time. |
| Workspace switcher | `src/components/workspace-switcher.tsx` | Add-a-business and cookie memory stay. |
| Brand | `brand_settings` | Name, colors, contact. |
| Business Brain | `business_brains` | Facts, customers, competitors (names only), differentiators, prohibited claims. |
| Offers | `offers`, constraints | What the business sells. |
| Brand Voice | `brand_voice_profiles`, examples | Tone and samples. Drafts must not send or publish. |
| Goals + snapshots | `growth_goals`, `goal_progress_snapshots` | Measurable objectives and history. |
| Plans + decisions | `growth_plans`, `decision_records` | Seed of Growth Memory. |
| Actions | `growth_actions` | Seed of the Action Ledger. Title, evidence JSON, confidence, impact, priority. Do not add `growth_opportunities`. |
| Later-run / execute gate | `execution_requests` | Adapter exists and stays **off**. |
| CMS review queue | `cms_publish_requests` | Adapter exists and stays **off**. |
| Website reads | `websites`, `website_discovered_pages` | Owner-named site. No live write. |
| Search Console | `search_console_snapshots`, `keywords`, `keyword_history` | Read-only `webmasters.readonly`. |
| GA4 | `ga4_snapshots` | Read-only `analytics.readonly`. Ads stay off. |
| Stripe copies | `payments`, `bookings` | No card data. No stripe-osa change. |
| CRM / events / attribution | `contacts`, `lead_records`, `customers`, `events`, `attribution_touches` | People-to-revenue labels already exist. |
| SEO drafts / audits | `seo_audits`, `seo_drafts` | A2 prepare. Apply only to GroovGro-hosted pages after click. |
| Content pipeline | briefs, drafts, gaps, compete moves, competitor sites, SERP notes, page structure, GEO notes/queries/history | Store and suggest. Do not publish or scrape. |
| Bot pipe | `bot_access_tokens`, scout/draft/write APIs | First Worker Gateway adapter. Owner does not manage seats. |
| Scheduler | `scheduled_jobs`, `/api/cron/jobs` | Daily/weekly refresh of stored copies. Manual buttons stay. |
| Audit + notifications | `audit_events`, `notifications` | Trace and “needs you.” |
| Deploy | Vercel, Neon, `vercel.ts` cron | Cloud-first. Cursor is not production. |

### Refactor (same tables, new clothes)

| Area | Change |
| --- | --- |
| `growth_actions` | Become the Action Ledger. Add fields only when a Phase 1 slice needs them (authority, risk class, skill/version, before/after, measurement window). Do not parse `description`. |
| Next step | One Best Next Move on Grow. Also Worth Doing and Watching from the same coordinator. |
| Intelligence observe | Feed Home pulse and Results. Stop being a listed-first factory. |
| Bot GET/POST | Keep contracts. Hide names. Coordinator assigns Research / SEO / Content / QA roles. |
| `growth_settings.autonomy_level` | Map to Guide me / Prepare it / Handle safe work / Custom. Default stays **Prepare it (A2)**. |
| SEO planner / queue | Work tabs, not a desk. |

### Rebuild or hide (front-end)

| Area | Change |
| --- | --- |
| App shell / module catalog nav | Five primary items. Modules can stay enabled; they do not each need a sidebar row. |
| Dashboard visual desk | Replace with Home: greeting, three-metric pulse, one next move, GroovGro is working, recent win, today. |
| Bot team page | Not a primary screen. |
| Search desk / scout inbox as product | Internal Work evidence. |
| Listed-first / remaining-count copy | Stop adding it. Existing strings can die with the shell. |
| Enterprise / jargon labels | SERP, CTR, CRO, executing, blocked, monitoring — owner language from the brief. |
| Social / Reviews / Billing nav | No screens yet. Do not add them in Phase 1. |

### Do not rebuild

- Clerk, Neon schema wipe, Stripe live checkout, tracking snippet, public lead form, coming-soon homepage, paused builder internals, Google OAuth apps.

---

## Inventory — workers and adapters

| Today | V3 role | Phase 1 owner sees | Status |
| --- | --- | --- | --- |
| Coordinated Next step | Coordinator | GroovGro is working / Best next move | Keep logic |
| SEOgro `/api/bots/scout` | SEO + Research (read stored + owner-named URLs) | Hidden | Live pipe. GroovGro does not wake the bot yet. |
| DRAFTgro `/api/bots/draft` | Content (social/email drafts) | Hidden | Live pipe. Must not send. |
| WRITEgro `/api/bots/write` | Content (page copy) | Hidden | Live pipe. Must not publish. |
| BOOKSgro | Out of launch set | Hidden | Parked 403. |
| QA | QA | Hidden | Not a separate seat yet. Phase 1 can be GroovGro-side checks already in drafts. |
| Website / Social / Email / Ads / Conversion / Reputation | Later workers | Hidden | Phase 2–3 of the new plan. Adapters off. |

Worker Gateway is **not** built as a named layer. The bot routes are the first adapter. Do not hard-wire a second provider. Do not invent a Grok inbound URL.

Research stays inside: Search Console, GA4, pages GroovGro already read, owner-named public URLs, owner-pasted pages. `requestCompetitorSearch` stays off.

---

## UI / UX debt (why the surface must change)

- **Too many doors.** Twenty-plus nav items. The new plan wants five.
- **AI is the product.** Bot team, scout inbox, desk tokens, pack types. The owner should see progress.
- **Jargon and leftover-work copy.** Listed-first headings and remaining counts were a factory, not a partner.
- **Dashboard is a control panel.** Charts and KPI rings before a conclusion.
- **Same recommendation in four places.** Next step, Intelligence, SEO, Dashboard.
- **Mobile is unpaid.** Sidebar sheet exists; core approval is not a 20-second phone flow.
- **Onboarding is setup, not learning.** Connect screens do not end on one useful insight.

Decision rule from the plan: correct experience is more important than protecting existing front-end code.

---

## Authority map (current → V3)

| V3 | Current | Allowed now |
| --- | --- | --- |
| A0 Observe | Read GSC, GA4, site, Stripe copies | Yes |
| A1 Recommend | Next step, Intelligence, SEO findings | Yes |
| A2 Prepare | Brand Voice drafts, content drafts, SEO drafts, later-review queue | Yes |
| A3 Execute approved | `requestExecute`, CMS publish adapter | **Off** until Jason names a host |
| A4 Autonomous | `growth_director`, `guarded_automation` | **Off** |

Default autonomy setting is already “prepare” (`autonomy_level` 2). Keep it.

---

## Suggested first coding slice (only after accept)

1. New shell: Home, Grow, Work, Results, Business. Old routes can redirect.
2. Home uses existing Goal, next step, alerts, and work counts. One Best Next Move.
3. Grow is today’s Next step coordinator plus Watching.
4. Work is Your work + approval queues, three tabs, no bot names.
5. Results is Intelligence conclusions without the factory.
6. Business is Brain + Offers + Voice + Goals + decision history.
7. Settings keeps switcher, integrations, schedules, team, and (advanced) desk token.
8. No new paid API. No scrape. No publish. No ads.

Do not implement that slice in this audit pull request.

---

## What this audit is not

- Not a Neon migration.
- Not permission to turn on execute, CMS write, GEO lookup, SERP, competitor search, or ads.
- Not a resume of the website builder.
- Not permission to keep stacking listed-first polish on the current console.
