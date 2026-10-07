# Stage 2 — UI migration map

Target primary nav: **Home | Grow | Work | Results | Business**. Ask GroovGro global. Settings holds complexity.

Current shell: `src/components/app-shell.tsx` + `src/lib/modules/catalog.ts` (modules each get a sidebar row).

| Current route | Current role | Map | Phase B action | Later |
| --- | --- | --- | --- | --- |
| `/app` Dashboard | Visual desk, alerts, next step, SEOgro inbox | **REPLACE** as Home | New Home: greeting, ~3-metric pulse, one Best Next Move, GroovGro is working, recent win, today / needs you. Reuse queries; drop desk chrome as the product. | D: READY / limitations, learned-so-far |
| `/app/next-step` | One coordinated step | **REFACTOR** → Grow | Redirect `/app/next-step` → `/app/grow`. Keep `next-step.ts`. | D: Watching + ODQ |
| `/app/work` Your work | Approved owner work | **REFACTOR** → Work | Tabs: Working / Needs you / Finished. | D: Questions vs Attention |
| `/app/intelligence` | Second dashboard / listed-first | **REPLACE** fragments | Hide from primary nav. Feed Home pulse + Results. Redirect to `/app/results` or Home. | — |
| `/app/seo` Search desk | SEO operations console | **MOVE TO ADVANCED / Settings** or Work evidence | Not a primary item. Deep link from Work/Grow. Hide scout jargon. | F: packs as JP artifacts |
| `/app/bot-team` | Owner manages seats | **MOVE TO ADVANCED / Settings** | Remove from primary nav. Settings → advanced. Owner copy: “GroovGro is working.” | F |
| `/app/business` | Flat Brain form | **REFACTOR** → Business | Keep route. Show what GroovGro knows in plain English. Do not add Fact schema codes. | C: learned-so-far from Facts |
| `/app/brand-voice` | Voice + drafts | **REFACTOR** into Business → Brand | Redirect. Drafts stay A2. | C |
| `/app/offers` | What we sell | **REFACTOR** into Business → Products & services | Redirect. | C |
| `/app/goals` | Measurable goals | **REFACTOR** into Business → Goals | Redirect. Snapshots stay. | — |
| `/app/growth-review` | Weekly summary | **REFACTOR** → Results / weekly brief | Redirect to Results. | — |
| `/app/website` | Read-only site | **MOVE TO SETTINGS** (or Business detail) | Keep read/find-pages. No live write. | E: Connection Center |
| `/app/analytics` | GA4 + tables | **REFACTOR** | Summary on Results; tables in Settings/detail. | E |
| `/app/marketing` | Named shares | **REFACTOR** | Results / Settings detail. | — |
| `/app/commerce` | Stripe copies | **KEEP** as Settings/detail | Not primary nav. Never charge; no stripe-osa change. | — |
| `/app/crm` | Leads & customers | **KEEP** as Work/Results detail | Not primary nav. | — |
| `/app/events` | Calendar | **KEEP** | Not V3 home. Settings or Work detail. | — |
| `/app/integrations` | Connect services | **REFACTOR** → Settings → Connections | Rename in copy. Progressive recommend, not onboarding wall. | E |
| `/app/settings/*` | Org, team, schedules, add business | **KEEP** | Switcher, cron, team stay. | — |
| `/app/settings/new-business` | Add org | **KEEP** | Later: start learning onboarding (D), not a giant form. | D |
| `/app/website-builder` | Paused builder | **RETIRE / hide** from primary | Stay paused. No resume. | — |
| `/app/media` | Assets | **KEEP** in Settings | — | — |
| `/app/audit` | Audit log | **KEEP** in Settings / advanced | — | C–G event types |
| `/app/notifications` | Alerts | **REFACTOR** | Presentation of Needs you / Attention. Not the ODQ store. | D |
| `/app/decisions` | Decision history | **REFACTOR** | Business → What we’ve learned (seed). | G |
| `/app/social`, `/app/reviews`, billing | Catalog only | **RETIRE / don’t add** | No screens in B. | Later if Jason asks |

## Phase B shell rules

- Five primary items only (plus overflow Settings).  
- Modules may stay enabled; they do not each need a nav row.  
- Old URLs redirect; no data loss.  
- No S1–S6, bot IDs, pack schemas, or “executing/blocked/monitoring” jargon on default screens.  
- Mobile: large taps, five-item nav, approval/status in seconds.  
- **No new onboarding engine in B** — do not wait for D to ship the shell. B may keep current connect flows behind Settings.

## Tone

Warm, clean, friendly, slightly playful, visual, plain English, professional enough to trust with a business.
