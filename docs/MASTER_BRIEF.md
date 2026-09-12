# GroovGro — Project Master Brief

**Version 2.2 — Business Partner + Competitor Looks** (11 September 2026)

Source of truth for product intent. Architecture and implementation must follow this document unless a later approved decision supersedes it. The V1 brief is archived at [MASTER_BRIEF_V1.md](MASTER_BRIEF_V1.md). Implementation notes and status of each slice: [v2/ARCHITECTURE.md](v2/ARCHITECTURE.md) and [STATUS.md](STATUS.md).

Version 2.1 added SEO Intelligence, a Content Engine, and AI Visibility / GEO as **modules that feed the same growth loop**. It does not replace V2. It does not make GroovGro a standalone SEO app.

Version 2.2 names the working relationship: GroovGro is a **business partner**. The owner runs day-to-day operations. GroovGro runs the marketing side — it watches, analyzes, and suggests work that can grow the business and bring in more revenue. The owner decides what gets implemented. Some suggestions the owner does. Some suggestions the owner authorizes GroovGro to do. It also records competitor looks: the owner can save a known competitor website, run a suggested search themselves, and GroovGro can read a public page they named. Automated search-engine discovery stays **PLANNED** behind an off adapter.

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

GroovGro is a business partner, not a second operator of the whole company. The owner runs day-to-day operations. GroovGro runs the marketing side: it watches the business, studies competitors the owner names (and later ones it is allowed to find), and suggests work that can grow the business and bring in more revenue. The owner decides. Some suggestions the owner does. Some suggestions the owner authorizes GroovGro to do. GroovGro does not implement marketing work until the owner says so.

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

The owner decides what happens. Some suggestions are owner work. Some suggestions wait until the owner authorizes GroovGro. Execute stays off until that authorization exists and the adapter is turned on.

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

Do not build a disconnected SEO / GEO product. Do not clone another company’s branding, wording, or UI. Do not auto-publish content by default. Do not generate large amounts of low-quality content. Do not chase traffic, impressions, or AI mentions without asking whether the business grew. Do not present estimates as facts. Do not treat a single AI answer as absolute truth. Do not scrape Google, Bing, social networks, or other providers in violation of their terms. Reading a public page the owner named — the same way GroovGro reads the owner’s own site — is allowed. Do not copy competitor words onto a live site. Do not hard-code a fixed list of AI companies through business logic. Do not buy keyword or SERP vendors until an adapter and a cost cap exist.

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

**Status:** vision approved 10 September 2026. Partner model recorded 11 September 2026. Phases A–T first slices are implemented. Owner-named competitor looks, owner-run suggested searches, stored-look compares, competitor page-topic gaps, briefs from those gaps, workspace drafts in this business’s words, offer checks on those drafts, later-review from the Content planner, and owner-saved compete moves are implemented. Do not turn on execute, Growth Director, SERP lookup, competitor search, GEO lookup, or CMS publish.

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
- Owner-entered competitor notes for queries the owner already sees (no lookup, scrape, or SERP vendor)
- Owner-named competitor websites: GroovGro can read that homepage and a few public pages on the same site, then store how they sell, how they market, and how we might compete. If the host blocks GroovGro’s server, it can read the same named URL through a public page reader, or the owner can paste the page. The owner can run a suggested search themselves and save a site they found. SEO can compare those stored looks to what this business sells, and name topics those sites show that GroovGro has not read on this business’s pages. The owner can save what they will do, including from a competitor page topic (no Google scrape, no copy onto a live site, no new page, GroovGro does not do that work, search discovery adapter off)
- Content gaps: worth-a-look Search Console queries compared to pages GroovGro already read (no new pages)
- Content briefs and planner: the owner can save a brief for a stored query, or for a competitor page topic GroovGro has not read on this business’s pages (no publish, no copy)
- Content drafts: GroovGro can write a workspace draft from a saved brief. A draft from a competitor-topic brief uses this business’s words and saved offers. GroovGro can check whether that draft names a saved offer or what makes this business different. The owner can save that draft for later review from the planner (no publish, no copy)
- Owner-entered CMS publish review queue from a workspace draft (adapter exists and stays off)
- Internal link suggestions and schema type estimates from pages GroovGro already read (no live-site write)
- Owner-entered AI visibility notes from what the owner already heard (no AI query, no scrape)
- Owner-entered AI query library for later visibility work (no live lookup)
- Owner-entered AI visibility history snapshots for a saved library question (no live lookup, no share of voice)
- Citation-gap estimates from those saved snapshots (no live lookup, no share of voice)
- Conservative cross-channel estimates from stored people, page, content, and AI-visibility facts (does not reorder Next step)
- DIRECT / ASSISTED / ESTIMATED / UNKNOWN labels on stored people-to-revenue joins (no keyword or AI-referral path)
- First stored Goal number compared to the latest stored Goal number (not an experiment GroovGro ran, and not a reason to change the plan)
- Owner-entered later-run queue from approved work (adapter exists and stays off)
- Specialists that read and recommend only. Ads, email, and social stay left alone
- Autonomy in product use: observe, recommend, draft, owner approve. Execute stays off

### PARTIALLY IMPLEMENTED

- Business knowledge: owner can save who to reach, pain points, known competitors, differentiators, and prohibited claims (Phase D). Later keyword/GEO work still does not read these into a scoring engine.
- Keywords: Search Console queries are stored as a keyword model with snapshot history (Phase E) and a conservative estimate rank (Phase F). Groups, intent, and paid keyword vendors stay **PLANNED**.
- Competitor / SERP notes: the owner can save who they already see for a stored query (Phase G first slice). The owner can also save a competitor website and ask GroovGro to read that public page. The owner can run a suggested search themselves and save a site they found. SEO can compare those stored looks to what this business sells, and name topics those sites show that GroovGro has not read on this business’s pages. The owner can save what they will do. Automated search-engine discovery, SERP vendors, and Google scrape stay **PLANNED** / off. GroovGro does not do that owner-saved work.
- Content gaps: worth-a-look stored queries are compared to pages GroovGro already read (Phase H first slice). Generation stays **PLANNED**.
- Content briefs: the owner can save a planner brief for a stored query or a competitor page-topic gap (Phase I first slice plus competitor gap briefs). Publishing stays **PLANNED**.
- Content drafts: a workspace draft can be written from a saved brief (Phase J first slice). A competitor-topic brief draft uses this business’s words. GroovGro can check whether that draft names a saved offer (Optimization first slice). The owner can save that draft for later CMS review from the Content planner (Review first slice; Phase P queue). Live CMS write stays **PLANNED**.
- Internal links and schema: suggestions and type estimates from pages GroovGro already read (Phase K first slice). Writing links or JSON-LD onto the live site stays **PLANNED**.
- AI Visibility / GEO: the owner can save what they already heard (Phase L), questions to remember (Phase M first slice), another history snapshot (Phase N first slice), and citation-gap estimates from that history (Phase O first slice). Live adapters and share of voice stay **PLANNED**.
- Attribution: named share → person → revenue exists. Phase R labels those stored joins DIRECT / ASSISTED / ESTIMATED / UNKNOWN. Keyword → page → person and AI-referral stay **PLANNED**.
- Experimentation: Phase S compares the first stored Goal number to the latest stored Goal number. A/B tests, split traffic, and using that look to change the plan stay **PLANNED**.
- Execution: Phase T lets the owner save approved work for later. The adapter stays off. Turning on execute, ads, email, social, Growth Director, and guarded automation stay **PLANNED**.
- Prioritization: Next step uses a fixed owner-assistance order. Phase Q stores a conservative channel comparison from workspace facts. That estimate does not reorder Next step.
- Brand Voice: does not learn from repeated owner edits
- Publishing: GroovGro-hosted builder exists and is **PAUSED**. Owner can queue a workspace draft for later review (Phase P first slice). No WordPress / Shopify write. Do not overwrite a connected existing website. The CMS adapter stays off.
- Notifications: table exists; the page is a stub (**PAUSED** as a product)
- `growth_actions`: exists for plan/owner work and recommend-only SEO rows. Phase B added optional `title`, `evidence` (JSON), `confidence`, `expected_impact`, and `priority`. Do not parse `description` as machine data.

### PLANNED (not implemented)

- Keyword groups, intent, create-vs-improve, paid keyword vendors
- Competitor and SERP lookup (contracted, allowed providers only). Owner-entered notes, owner-named website looks, owner-run suggested searches, stored-look compares, and competitor page-topic gaps exist. Automated finding from search terms stays behind an off adapter. Do not scrape Google.
- Publishing links or schema onto a live site. Gap detection, briefs, workspace drafts, and page-structure facts exist.
- Live CMS write after owner approval. A review-only queue and a disabled adapter exist.
- AI Visibility / GEO adapters, mentions, citations, share of voice, accuracy. Owner-entered notes, a query library, history snapshots, and citation-gap estimates exist. Lookup stays off.
- Using stored channel scores to reorder Next step, using a before-and-after to change the plan, alerts
- Cost controls before paid keyword or AI-scan vendors
- Turning on execute, Growth Director, and guarded automation

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

Future: keyword groups; intent; SERP and competitor lookup; page improvement; create vs improve; conversion- and revenue-aware priority.

Search volume is not success. Traffic is not success. Prefer activity that produces qualified people, customers, revenue, and a Goal.

### Content Intelligence (**PARTIALLY IMPLEMENTED**; Brand Voice drafts are **IMPLEMENTED** in-workspace only)

Today: worth-a-look Search Console queries can be compared to pages GroovGro already read. The owner can save a brief to the SEO planner, write a workspace draft from it, check a competitor-topic draft against a saved offer, and save that draft for later CMS review from the planner. GroovGro can suggest internal links and estimate schema types from pages it already read. GroovGro does not publish or write the live site. The CMS adapter stays off.

Future workflow: Opportunity → Research → Brief → Draft → Optimization → Review → Publish when authorized → Measure → Learn.

Possible later work: brand-voice generation, improve existing pages, recommend new pages, write links or schema onto a live site, measure content.

GroovGro does **not** currently auto-generate or publish a large volume of content.

### AI Visibility / GEO (**PARTIALLY IMPLEMENTED**)

Traditional SEO: can customers find the business in search engines?

AI Visibility: does the business appear when people ask AI systems questions or ask who to hire?

Today: the owner can save what they already heard when they asked an AI system, questions to remember for later, and another snapshot of that history. GroovGro can estimate citation gaps from those snapshots. GroovGro does not ask AI systems. The adapter stays off. One answer is not treated as truth.

Future: brand mentions and citations; competitor mentions and citations; share of voice; trends; content and citation gaps; accuracy issues; GEO audits; recommendations for AI-readable, citable pages.

Possible environments (examples only, not a hard-coded vendor list, not all available today): ChatGPT, Google AI experiences, Gemini, Perplexity, Claude, Grok, DeepSeek, and later systems. Use modular **provider adapters**. Confirm API, terms, cost, and permission before any automated query. **Do not scrape.** Do not treat one AI answer as truth. Store history. Lookup stays off until an adapter is approved.

### Revenue-aware attribution (**PARTIALLY IMPLEMENTED**)

**IMPLEMENTED:** named share → visitor/lead → customer → Stripe charge copy. Those stored joins can be labeled DIRECT, ASSISTED, ESTIMATED, or UNKNOWN.

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
| G | Competitor and SERP intelligence | **IMPLEMENTED** first slice — owner-entered notes. Owner-named website looks are a later slice on the same module. Search discovery stays off. No Google scrape. No vendor. |
| H | Content gap detection | **IMPLEMENTED** first slice — stored worth-a-look queries vs pages already read. No brief. No new page. |
| I | Content briefs and planner | **IMPLEMENTED** first slice — owner-entered briefs on the SEO planner. No article copy. No publish. |
| J | Content generation / optimization | **IMPLEMENTED** first slice — workspace draft from a saved brief. No publish. No live-site edit. |
| K | Internal linking and schema | **IMPLEMENTED** first slice — suggestions and type estimates from pages already read. No live-site write. |
| L | AI Visibility / GEO architecture | **IMPLEMENTED** first slice — owner-entered notes only. No scrape. No adapter. |
| M | AI query library and provider adapters | **IMPLEMENTED** first slice — owner-entered library. Adapter exists and stays off. No scrape. |
| N | AI visibility measurement and history | **IMPLEMENTED** first slice — owner-entered snapshots from a saved library question. Adapter stays off. No scrape. No share of voice. |
| O | GEO audits and citation gaps | **IMPLEMENTED** first slice — citation-gap estimates from the latest saved history snapshot. Adapter stays off. No scrape. No share of voice. |
| P | CMS publishing adapters | **IMPLEMENTED** first slice — owner-entered review queue from a workspace draft. Adapter exists and stays off. No live-site write. |
| Q | Cross-channel opportunity scoring | **IMPLEMENTED** first slice — estimate from stored people, page, content, and AI-visibility facts. Does not reorder Next step. No ads. No execute. |
| R | Attribution improvements | **IMPLEMENTED** first slice — DIRECT / ASSISTED / ESTIMATED / UNKNOWN on stored people-to-revenue joins. No keyword path. No AI referral. Matching charges stays on Bookings. |
| S | Experimentation / before-and-after | **IMPLEMENTED** first slice — first stored Goal number vs latest stored Goal number. Not an experiment GroovGro ran. Does not change the plan. No ads. No A/B. |
| T | Carefully expanded execution | **IMPLEMENTED** first slice — owner-entered later-run queue from approved work. Adapter exists and stays off. No ads. No email. No live-site write. Growth Director stays off. |

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
