# Roadmap, expensive decisions, and spec notes

## Phased implementation

Matches the brief §38. Each phase is one or more Cloud Agent PRs with Preview deploys. Do not start a phase until the previous phase has something real to show.

### Phase 1 — Foundation

Create the Next.js app, Neon schema (Phase 1 tables), Clerk auth, org switcher, RBAC, module entitlements, dashboard shell, org/brand settings, integration connection UI (empty adapters), audit log, notification bell, feature flags, platform admin skeleton.

**Done when:** you can sign in, create/select an organization, see an empty dashboard that changes when a module flag is flipped, invite a user, and view an audit row — on a Vercel Preview.

### Phase 2 — First real business data

Connect one Mogia Group business (recommended: Ocean Sailing Adventures).

Website connection, Stripe booking/payment sync, contacts, leads, customers, basic activity, events if they help that business.

**Done when:** external data → GroovGro → normalized records → a dashboard that is useful for that business.

### Phase 3 — Marketing / attribution

Campaign/source tracking, lead and customer attribution, Stripe revenue attribution, marketing dashboard.

**Done when:** you can see marketing → lead → customer → revenue for at least one channel, even if imperfect.

### Phase 4 — Intelligence

Summarize, explain, compare, detect, recommend on **real** normalized data. Observe + Recommend only.

### Phase 5 — Brand voice / content

Approved examples, profile, generation, “more like this / less like this.”

### Phase 6 — SEO

Audit, recommendations, technical monitoring, Search Console when OAuth is ready, plain-language AI explanation.

**Now in the app:** homepage check, drafts you approve, score over time, a plain-language explanation, and Search Console read-only (after Google OAuth keys are in Vercel).

### Phase 7 — Website builder

Section-based builder. Not before the core platform is useful. Existing-site customers never need this module.

**Now in the app:** visual GroovGro-hosted pages at `/w/[org]` and `/w/[org]/[slug]`. Full-page editor with rows and columns, a signed-in **Preview** that is not live, page/row/widget colors, heading sizes and text links, extra widgets, four numbered starter templates, extra pages, SEO on every GroovGro page, and photo uploads to Vercel Blob. Custom domains wait.

### Phase 8 — Additional integrations

Google Ads, Meta, Mailchimp, reviews, more analytics, more social — each as an adapter.

### Phase 9 — Controlled automation

Approval workflows, drafts, allow-listed actions, narrow rules. Still no unrestricted AI.

### Phase 10 — Commercialization

Plans, module billing, public signup, adaptive onboarding, support tools, usage monitoring. Pricing still not invented in engineering.

Native Expo apps stay after this unless a later brief says otherwise.

## Decisions that are expensive to change later

Approve these now or name an alternative **before** Phase 1.

| Decision | Recommendation | Cost of reversing later |
| --- | --- | --- |
| Tenancy | Shared schema + `organization_id` + RLS | Very high (data migration of every table) |
| Identity | Clerk for auth; GroovGro DB for orgs/roles | High (session and user rewrite) |
| App shape | One Next.js modular monolith on Vercel | High (split services, networking, auth) |
| Contacts | One `contacts` person; leads/customers are states | High (duplicate merge) |
| Money | Integer cents + currency; Stripe IDs as external keys | High |
| Modules | Entitlement table, not separate apps | High |
| Jobs | Vercel Cron + Workflow + Function webhooks | Medium |
| Files | Vercel Blob, tenant-prefixed keys | Medium |
| Email | Adapter; Resend first | Low–medium |
| Payments | Adapter; Stripe first; never store PAN | High if you store cards (don’t) |
| Product hostname | `groovgro.com` (optional `app.` later) | Medium (cookies, Clerk URLs, CORS) |
| Website builder hosting | Defer; connect existing sites first | High if you bet the company on a canvas in v1 |
| AI | AI SDK + Gateway; no execute until Phase 9 | Medium |
| Repo visibility | Public GitHub — treat as public forever | Medium (secret hygiene, not architecture) |

## Things in the specification to change or clarify before Phase 1

These are recommendations, not rejections of the vision.

1. **Name Clerk (or another hosted IdP).** The brief requires secure auth but does not name a provider. Recommendation: Clerk via Vercel Marketplace.

2. **Name Neon as the Postgres.** The brief says cloud database; Marketplace Neon is the fit.

3. **Name Vercel Blob for the media library.** Avoid “we’ll put files on SiteGround.”

4. **Unify leads and customers as contacts.** Already implied by §13; lock it in so Phase 2 does not create two people tables.

5. **Reconcile “do not assume Vercel must perform every function” with a Vercel-first monolith.** Recommendation: Vercel-first until a measured limit appears. Do not pre-split.

6. **Platform Super Admin is not an organization role.** Keep it off the org role list in the UI.

7. **GitHub as a customer integration vs source control.** GitHub is GroovGro’s source of truth. It is not a Phase 1 customer-facing integration unless Mogia Group wants repo stats in the product (unlikely).

8. **Expo.** Agree it stays out of this repository until a mobile phase exists.

9. **First test organization.** Confirm Ocean Sailing Adventures (and the existing Stripe booking system) as the Phase 2 target.

10. **Public repository.** Fine for a startup codebase; requires perfect secret hygiene. If customer data samples ever appear, they must not be committed.

11. **Attribution identity.** Phase 3 will need a first-party tracking approach for connected websites (a small GroovGro script) rather than hoping Google Analytics alone reconstructs the journey. Call that out now so SiteGround customers know a script snippet is coming.

12. **Custom domains for GroovGro-built sites.** Phase 7 problem. Do not design Phase 1 around it.

13. **Pricing.** Correctly deferred. Still add `organization_modules` now so billing has something to attach to later.

14. **“Learn brand voice from approved examples” vs model fine-tuning.** Recommendation: retrieval of approved examples + structured profile fields. Do not fine-tune a private model in v1.

No change is recommended to: modularity, multi-tenancy, AI levels, no scraping, no card storage, no sailing-specific schema, website builder delayed until Phase 7, or Cursor-out-of-production.

## Stop line

Phase 0 stops here. The next code that belongs in this repo after approval is Phase 1 scaffolding (Next.js, Clerk, Neon, dashboard shell) — not the website builder, not ads, not autonomous AI.
