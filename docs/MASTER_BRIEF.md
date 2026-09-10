# GroovGro — Project Master Brief

**Version 2.1 — Goal-Driven Growth Architecture** (10 September 2026)

Source of truth for product intent. Architecture and implementation must follow this document unless a later approved decision supersedes it. The V1 brief is archived at [MASTER_BRIEF_V1.md](MASTER_BRIEF_V1.md). Implementation notes and status of each slice: [v2/ARCHITECTURE.md](v2/ARCHITECTURE.md) and [STATUS.md](STATUS.md).

Version 2.1 adds SEO Intelligence, a Content Engine, and AI Visibility / GEO as **modules that feed the same growth loop**. It does not replace V2. It does not make GroovGro a standalone SEO app.

**Product:** GroovGro  
**Primary domain:** groovgro.com  
**Alternate domain:** groovegro.com  
**Parent company:** Mogia Group · mogiagroup.com  

---

## 1. Vision

Build GroovGro as a professional, cloud-based, modular business growth, marketing, website, automation, analytics, CRM, and AI platform.

GroovGro should help a business connect the systems it already uses, understand itself, understand what it sells, understand its customers and constraints, define measurable growth objectives, create coordinated strategies, execute marketing, capture leads, connect customers to revenue, analyze performance, recommend actions, eventually execute approved actions, and learn from outcomes.

GroovGro must not simply become another website builder, CRM, social scheduler, SEO app, ads dashboard, AI content generator, analytics platform, or collection of unrelated AI agents.

Primary value comes from understanding the relationships between the business, its objectives, its customers, its marketing activities, and its financial outcomes.

**CONNECT THE BUSINESS. UNDERSTAND THE BUSINESS. DEFINE THE GOAL. GROW THE BUSINESS.**

Official intelligence loop:

CONNECT → UNDERSTAND → OBSERVE → ANALYZE → IDENTIFY OPPORTUNITIES → PRIORITIZE → RECOMMEND → OWNER REVIEW → EXECUTE WHEN AUTHORIZED → MEASURE → LEARN → REPEAT

The owner should not have to think in separate marketing disciplines. GroovGro should eventually synthesize website, SEO, content, AI visibility, advertising, traffic, leads, customers, and revenue, then recommend the highest-value next action.

Journeys to understand:

Website → Traffic → Marketing Source → Lead → Customer → Booking / Purchase / Conversion → Payment / Revenue → Review → Repeat Customer

The longer growth chain GroovGro should eventually understand:

BUSINESS → MARKET → WEBSITE → SEO → AI SEARCH VISIBILITY → CONTENT → ADVERTISING → TRAFFIC → LEADS → CUSTOMERS → REVENUE → LEARNING → NEXT BEST ACTION

V2 layer:

BUSINESS OBJECTIVE → GROWTH PLAN → MARKETING ACTIONS → CUSTOMER RESPONSE → BUSINESS OUTCOME → LEARNING → NEXT ACTION

Sometimes the next best action is SEO. Sometimes it is content. Sometimes it is AI visibility. Sometimes it is following up a person, fixing a page, or waiting. GroovGro should compare those options against the Goal, not optimize one channel because it is easy to measure.

The system should eventually answer: what is this business trying to accomplish, are we closer, which activities help or waste, what should get more or fewer resources, what should happen next, is there enough evidence to change, should we leave something unchanged, has a constraint changed, has the objective already been achieved, and what did GroovGro learn?

## 2. Industry neutrality

Examples in this brief are illustrative only. They are never universal business models, database fields, terminology, customer types, capacity types, inventory models, sales processes, conversion types, workflows, or industry assumptions.

Do not design the core around seat, student, appointment, room, class, ticket, boat, or product unit. Model availability, availability_unit, resource, and constraint. Industry meaning belongs in organization data.

GroovGro must understand the actual business rather than force the business into GroovGro's assumptions.

## 3. Modular architecture

Customers are not required to use every capability. Design database, permissions, navigation, billing, application architecture, AI architecture, and integrations around independently enabled modules. Do not tightly couple modules.

## 4. Multi-tenant architecture

| Term | Meaning |
| --- | --- |
| Organization | Customer / business account |
| User | Person accessing an organization |
| Module | GroovGro capability |
| Integration | Connected external service |
| Goal | Measurable business objective |
| Growth Plan | Coordinated strategy pursuing a goal |
| Action | Shared recommendation object (`growth_actions`). Proposed, approved, or later executed. Also the preferred home for SEO / GEO / content / lead opportunities. |

Isolate per organization: users, roles, websites, customers, leads, marketing data, integrations, analytics, AI context, Business Brain, Brand Voice, assets, events, settings, goals, plans, **growth actions**, decision history, and later keywords, content items, and AI visibility scans. SEO, competitor, content, and AI-visibility data from one organization must never appear in another.

Do not add a separate `growth_opportunities` table unless `growth_actions` cannot cleanly hold the shared recommendation. See §15.

## 5. Business Brain

Every organization develops a structured Business Brain. It is the shared source of organizational context. It may contain identity, offers, customers, brand, constraints, and performance.

Use structured data. Do not represent the Business Brain solely as an AI prompt or vector store. Store confidence and source where inference is used. Owners can correct GroovGro.

Discovery flow: DISCOVER → INFER → ASK → CONFIRM → LEARN. AI inference must not silently become authoritative when uncertainty is meaningful.

For a connected website, GroovGro finds pages, asks which ones matter, then reads only the checked pages. Drafts from those pages stay inactive until the owner confirms.

## 6. Offers, availability, and constraints

An Offer is what an organization promotes, sells, provides, or wants customers to act upon. It is not assumed to be a physical product.

Availability is optional and generalized: inventory, capacity, schedule, resource, workload, time window, externally determined, or unconstrained. Organizations may use several at once.

## 7. Growth Goals, Plans, Actions, and Decision History

Goals are first-class measurable outcomes. Plans are versioned strategies for a Goal. Do not overwrite meaningful historical strategy. Store computed Goal progress when connected data can measure it, so later reviews can compare a history instead of only a live count.

Decision History records what GroovGro decided and why. Audit History records what changed. Both are required.

Actions (`growth_actions`) are the shared recommendation object: module, type, description, risk, approval, and later execution fields. They are **not executed** in the current product. SEO, content, AI visibility, website, and lead recommendations should become rows here so Next step can compare them. Do not invent a second opportunity table first.

## 8. Evidence and cadence

Do not equate new data with a requirement to act. “No change is recommended yet” is a valid and important recommendation.

Separate monitoring, analysis, decision-making, execution, and user review. Daily analysis does not imply daily optimization changes.

Users control when routine Growth Reviews are presented. That schedule does not force GroovGro to change the business.

Channel-specific evidence windows: advertising, SEO, email, social, and website/CRO each wait differently.

Classify changes as operational, optimization, or strategic. That classification influences evidence threshold, approval, cadence, and automation eligibility.

Urgent operational issues may bypass the routine review schedule.

## 9. Autonomy and guardrails

1 Observe · 2 Recommend · 3 Draft · 4 Approve to execute · 5 Guarded autopilot · 6 Future autonomous growth.

Do not build unrestricted autonomy. Growth Director and guarded automation stay feature-flagged off until later phases.

Every automated action must pass authentication, organization authorization, module entitlement, provider capability, risk policy, and automation guardrails. AI must never bypass application authorization.

## 10. Dashboard and reviews

The dashboard answers: what are we trying to accomplish, how are we doing, what changed, why, what needs attention, what should happen next, and what is intentionally being left alone.

Traditional analytics remain accessible but should not dominate. Weekly and monthly reviews are generated from connected evidence and can be saved to Decision History. Speak plain English. Do not design around AI employee personas.

## 11. What stays from V1

Multi-tenancy, modularity, RBAC, cloud architecture, provider adapters, jobs, audit, notifications, tenant isolation, generic events, Stripe read-copy strategy, optional website builder, lightweight CRM, provider independence, feature flags, modular monolith, incremental development, and security.

Do not delete or rewrite working V1 functionality simply because V2 adds concepts. The website builder remains optional and must not overwrite a connected existing website or change Stripe checkout.

## 12. What not to build yet

Unrestricted Growth Director, autonomous cross-channel budget management, fully autonomous advertising, premature sophisticated attribution, native mobile apps, unnecessary microservices, unrestricted website canvas, dozens of integrations at once, gimmicky AI employees, unsupported predictive models, or complex ML infrastructure.

Do not create fake sophistication. Do not start ads. Do not store payment card data.

Do not build a disconnected SEO / GEO product. Do not clone another company’s branding, wording, or UI. Do not auto-publish content by default. Do not generate large amounts of low-quality content. Do not chase traffic, impressions, or AI mentions without asking whether the business grew. Do not present estimates as facts. Do not treat a single AI answer as absolute truth. Do not scrape providers in violation of their terms. Do not hard-code a fixed list of AI companies through business logic. Do not buy keyword or SERP vendors until an adapter and a cost cap exist.

## 13. Operating principle

**Continuously observe without continuously interfering.**

More activity is not inherently better. More changes are not inherently better. The objective is better business outcomes.

North star: *What is this business trying to accomplish, and based on sufficient evidence, what should happen next to increase the probability of achieving it?*

Sometimes the correct answer is: nothing yet. Keep collecting evidence.

## 14. Development

Cloud-first. GitHub is the source of truth. Production is Vercel, not a laptop. Public repository: never commit secrets. TypeScript, strong typing, modular files, tests for critical logic, migrations, documented env vars.

Current implementation checkpoint: [STATUS.md](STATUS.md).

## 15. Status words used in this brief

Use these labels. Do not make planned work sound shipped.

| Label | Meaning |
| --- | --- |
| **IMPLEMENTED** | In the live app on `main` |
| **PARTIALLY IMPLEMENTED** | Real, but thinner than the vision |
| **PLANNED** | Approved direction, not built |
| **EXPERIMENTAL** | In code or docs for learning; not a product promise |
| **PAUSED** | Built or designed; do not extend until Jason asks |
| **DEPRECATED** | Do not follow for new work |

## 16. SEO, content, and AI visibility feed Growth Intelligence

**Status:** vision approved 10 September 2026. Phases A–F first slices are implemented. Do not start Phase G–T until Jason asks.

GroovGro is an AI-powered business growth system. SEO Intelligence, Content Intelligence, and AI Visibility / GEO are modules that feed the same loop. They are not a second application and not a clone of another SEO product.

Every new feature should, when possible, produce: an insight, an opportunity stored as a **growth action**, a recommendation on Next step, a measurable result, and learning.

### IMPLEMENTED

- Business Brain (including owner-entered who-to-reach, problems, known competitors, differences, and prohibited claims), Brand, Offers, Brand Voice (profile, examples, in-workspace drafts)
- Website connect, discovered pages, review of checked pages only
- Named marketing shares: visit → lead → customer → payment copy
- Goals, Growth Plans, Next step, Intelligence, weekly / monthly review, Decision History, what changed
- SEO **page** checks and homepage SEO copy drafts the owner approves (they do not edit the connected live site)
- Search Console **read-only** snapshots: totals, top queries, top pages
- Keyword model and history from those stored Search Console queries, with a conservative estimate rank (no vendor volume)
- Specialists that read and recommend only. Ads, email, and social stay left alone
- Autonomy in product use: observe, recommend, draft, owner approve. Execute stays off

### PARTIALLY IMPLEMENTED

- Business knowledge: owner can save who to reach, pain points, known competitors, differentiators, and prohibited claims (Phase D). Later keyword/GEO work still does not read these into a scoring engine.
- Keywords: Search Console queries are stored as a keyword model with snapshot history (Phase E) and a conservative estimate rank (Phase F). Groups, intent, paid keyword vendors, and SERP stay **PLANNED**.
- Attribution: named share → person → revenue exists. Keyword → page → person and AI-referral do not. Labels DIRECT / ASSISTED / ESTIMATED / UNKNOWN are **PLANNED**
- Prioritization: Next step uses a fixed owner-assistance order. Scored “SEO vs follow up a person vs fix a page” is **PLANNED**
- Brand Voice: does not learn from repeated owner edits
- Publishing: GroovGro-hosted builder exists and is **PAUSED**. No WordPress / Shopify write. Do not overwrite a connected existing website
- Notifications: table exists; the page is a stub (**PAUSED** as a product)
- `growth_actions`: exists for plan/owner work and recommend-only SEO rows. Phase B added optional `title`, `evidence` (JSON), `confidence`, `expected_impact`, and `priority`. Do not parse `description` as machine data.

### PLANNED (not implemented)

- Keyword groups, intent, create-vs-improve, paid keyword vendors
- Competitor and SERP intelligence (contracted, allowed providers only)
- Content gaps, briefs, planner, generation, internal linking, schema (facts only)
- CMS publishing adapters (review-first)
- AI Visibility / GEO: query library, adapters, mentions, citations, share of voice, accuracy, GEO audits
- Cross-channel scoring, experiments, alerts
- Cost controls before paid keyword or AI-scan vendors
- Specialist execute and guarded automation

### Shared object: extend `growth_actions`

**Architectural preference:** extend `growth_actions`. Do **not** create `growth_opportunities` unless a later review proves the existing table cannot hold this cleanly.

Today the table already has: `organization_id`, `goal_id`, `plan_id`, `module`, `action_type`, `description`, `status`, `risk`, `proposed_at`, `approved_at`, `executed_at`, `provider`, `result`, `error`.

Phase B added: `title`, `evidence` (JSON), `confidence`, `expected_impact`, `priority`. Not added yet: effort, estimated cost, urgency, reviewed_at, measurement window, learning. Avoid duplicate concepts. Do not parse `description` as machine data.

Phase C writes recommend-only SEO rows (`module` = `seo`, `action_type` = `seo_page_improvement` or `seo_search_opportunity`, `status` = `proposed`, `provider` + `external_id` for dedup). New rows also fill the Phase B fields. Description stays a human fallback.

Next step and Intelligence stay the owner surfaces. Module pages stay for detail.

Example compatible recommendations (all `growth_actions`):

- SEO: improve a page
- Leads: follow up uncontacted people
- Website: fix a poor-converting landing page
- Ads (**PLANNED**, do not build now): change a profitable campaign
- AI Visibility (**PLANNED**): improve a page competitors are cited for

GroovGro should eventually explain **why**, with evidence, confidence, expected impact, and effort. Facts, estimates, and inference stay labeled.

### SEO Intelligence (**PARTIALLY IMPLEMENTED** page checks; rest **PLANNED**)

Today: title, description, heading, and similar page checks; owner-approved drafts; Search Console totals and top queries; those existing sources can create recommend-only Growth Actions when evidence clears conservative thresholds; stored Search Console queries become a keyword model with snapshot history and a conservative estimate rank.

Future: keyword groups; intent; SERP and competitor analysis; content gaps; page improvement; create vs improve; conversion- and revenue-aware priority.

Search volume is not success. Traffic is not success. Prefer activity that produces qualified people, customers, revenue, and a Goal.

### Content Intelligence (**PLANNED**; Brand Voice drafts are **IMPLEMENTED** in-workspace only)

Future workflow: Opportunity → Research → Brief → Draft → Optimization → Review → Publish when authorized → Measure → Learn.

Possible later work: briefs, planner, internal links, schema, brand-voice generation, improve existing pages, recommend new pages, measure content.

GroovGro does **not** currently auto-generate or publish a large volume of content.

### AI Visibility / GEO (**PLANNED**)

Traditional SEO: can customers find the business in search engines?

AI Visibility: does the business appear when people ask AI systems questions or ask who to hire?

Future: query library; brand mentions and citations; competitor mentions and citations; share of voice; trends; content and citation gaps; accuracy issues; GEO audits; recommendations for AI-readable, citable pages.

Possible environments (not a hard-coded vendor list, not all available today): ChatGPT, Google AI experiences, Gemini, Perplexity, Claude, Grok, DeepSeek, and later systems. Use modular **provider adapters**. Confirm API, terms, cost, and permission before any automated query. **Do not scrape.** Do not treat one AI answer as truth. Store history.

### Revenue-aware attribution (**PARTIALLY IMPLEMENTED**)

**IMPLEMENTED:** named share → visitor/lead → customer → Stripe charge copy.

**PLANNED:** keyword → page → visitor → lead → customer → revenue; ad → visitor → lead → customer → revenue; AI referral → visitor → lead → customer → revenue.

Never invent certainty. Label each link:

- **DIRECT** — GroovGro stored the join
- **ASSISTED** — the person or visit touched more than one source
- **ESTIMATED** — inferred, not measured
- **UNKNOWN** — missing

### Weekly review (**IMPLEMENTED**, cadence options **PARTIALLY IMPLEMENTED**)

GroovGro may observe continuously. It must not nag the owner every day. The owner controls when they look (weekly is the default; daily / bi-weekly / monthly / custom may be offered later). Collect evidence between reviews. Present a few meaningful items, including “nothing yet.”

### Evidence provenance and history (**PARTIALLY IMPLEMENTED**)

Store where important facts came from when practical: user-entered, website crawl, Search Console, analytics, Stripe, CRM, later ads/CMS/AI/keyword providers, or GroovGro inference.

Do not overwrite the only copy of a metric. Keep snapshots (Search Console already stores snapshots). Later: rankings, content, AI visibility, citations, competitors, conversions, opportunities, experiments. Learning needs before and after.

### Expansion phases (conceptual — do not rebuild V2 to fit)

| Phase | Work | Status |
| --- | --- | --- |
| A | Documentation and architecture alignment | **IMPLEMENTED** |
| B | Extend `growth_actions` with optional opportunity fields | **IMPLEMENTED** — title, evidence JSON, confidence, expected impact, priority. No second table. |
| C | Existing Search Console + SEO findings → `growth_actions` → Next step + Intelligence (recommend-only) | **IMPLEMENTED**. No paid API. No scrape. No live-site edit. |
| D | Business Brain extras SEO/GEO need | **IMPLEMENTED** — owner-entered lists only. No scrape. No keyword engine. |
| E | Keyword model and history from Search Console | **IMPLEMENTED** — stored GSC queries only. No vendor. No score. |
| F | Keyword opportunity scoring | **IMPLEMENTED** — estimate from stored GSC numbers only. No vendor volume. No SERP. |
| G | Competitor and SERP intelligence | **PLANNED** |
| H | Content gap detection | **PLANNED** |
| I | Content briefs and planner | **PLANNED** |
| J | Content generation / optimization | **PLANNED** |
| K | Internal linking and schema | **PLANNED** |
| L | AI Visibility / GEO architecture | **PLANNED** |
| M | AI query library and provider adapters | **PLANNED** |
| N | AI visibility measurement and history | **PLANNED** |
| O | GEO audits and citation gaps | **PLANNED** |
| P | CMS publishing adapters | **PLANNED** |
| Q | Cross-channel opportunity scoring | **PLANNED** |
| R | Attribution improvements | **PLANNED** |
| S | Experimentation / before-and-after | **PLANNED** |
| T | Carefully expanded execution | **PLANNED** — still gated |

**Do not expand yet:** Google Ads execution, email send, social post, Growth Director autopilot, hosted website builder, autonomous publishing.

Phase C rules: recommend-only. No automatic execution or publishing. No paid keyword API. No AI-platform scraping. No live website editing.

## 17. Human control, adapters, and cost

Current product: **LEVEL 1 Observe · LEVEL 2 Recommend · LEVEL 3 Draft · owner approve**. LEVEL 4 execute-after-approval and LEVEL 5 guarded autopilot stay off.

High-impact or hard-to-reverse actions stay approval-gated unless the owner explicitly authorizes them.

Future third-party capabilities use adapters, not core `if (vendor === …)` logic: keyword data, SERP, AI visibility, CMS publish, ads, analytics. Search Console already exists as a read-only Google adapter.

Variable API cost is an architecture requirement: caching, batching, scheduled/weekly jobs, priority-query scans, org usage limits, provider rate limits, token budgets, deduplication, retries, and skip re-analysis when evidence has not changed. Do not assume unlimited AI calls.

Credentials stay in Vercel. This repository is public. Minimum scopes. Search Console stays read-only until a later approved write adapter exists.

## 18. The differentiator

GroovGro must not optimize a metric only because it is easy to measure.

More impressions, clicks, traffic, content, or AI mentions are not automatically success.

The question remains: **did this help the business grow?**

## 19. Documentation

Canonical files: this brief, [v2/ARCHITECTURE.md](v2/ARCHITECTURE.md), [STATUS.md](STATUS.md), [AGENTS.md](../AGENTS.md). Phase 0 is **historical** platform planning. Setup guides under `docs/phase-1` through `docs/phase-7` are how-to for services that are already connected. Do not add a second SEO brief.
