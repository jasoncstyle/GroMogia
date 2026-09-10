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
| Action | Proposed, approved, or executed activity |

Isolate per organization: users, roles, websites, customers, leads, marketing data, integrations, analytics, AI context, Business Brain, Brand Voice, assets, events, settings, goals, plans, actions, decision history, keywords, content items, AI visibility scans, growth opportunities, billing, and audit history. SEO, competitor, content, and AI-visibility data from one organization must never appear in another.

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

Actions are structured entities with risk, approval, and execution fields. They are not executed in this foundation slice.

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

## 15. SEO, content, and AI visibility feed Growth Intelligence

**Status:** vision approved 10 September 2026. Parts already exist (see below). The rest is planned. Do not mark planned work as implemented.

GroovGro already asks: *What is this business trying to accomplish, and what should happen next?* SEO Intelligence, the Content Engine, and AI Visibility / GEO must answer that question. They must not become a second application.

Closed loop (same as V2):

OBSERVE → ANALYZE → IDENTIFY → PRIORITIZE → RECOMMEND → OWNER REVIEW → EXECUTE (later, after approval) → MEASURE → LEARN → REPEAT

Every new SEO, content, or AI-visibility feature should produce, when possible: an insight, an opportunity, a recommendation, an action the owner can review, a measurable result, and learning. Isolated dashboards that only display numbers are not enough.

### What is already implemented

- Business Brain, Brand, Offers, Brand Voice (profile, examples, in-workspace drafts)
- Website connect, discovered pages, review of checked pages only
- Named marketing shares: visit → lead → customer → payment copy
- Goals, Growth Plans, Next step, Intelligence, weekly / monthly review, Decision History, what changed
- SEO page checks, homepage SEO copy drafts the owner approves (they do not edit the connected live site)
- Search Console **read-only** snapshots: totals, top queries, top pages
- Specialists that read and recommend only. Ads, email, and social stay left alone
- Autonomy levels 1–3 in product use: observe, recommend, draft. Execute stays off

### What is partially implemented

- Business knowledge: missing structured personas, pain points, competitors, differentiators, and prohibited claims
- Attribution: named share → person → revenue exists. Keyword → page → person and AI-referral attribution do not
- Prioritization: Next step uses a fixed owner-assistance order. It does not yet score “SEO vs follow up a person vs fix a page”
- Brand Voice: does not yet learn from repeated owner edits
- Publishing: GroovGro-hosted builder exists and is **paused**. No WordPress / Shopify write adapter. Do not overwrite a connected existing website
- Notifications: table exists; the product page is a stub

### What is planned (not implemented)

- Keyword discovery, groups, opportunity scores, and revenue-aware keyword value
- Competitor and search-results intelligence (legal, contracted providers only)
- Content gap types, briefs, planner, generation, internal linking, and schema recommendations
- CMS publishing abstraction (review-first; auto-publish only if the owner turns it on)
- AI Visibility / GEO: query library, provider adapters, mention / citation history, accuracy issues, GEO audits
- Unified Growth Opportunity object and cross-channel priority scoring
- Experiments with stored before / after
- Meaningful alerts without alert fatigue
- AI scan cost controls (cache, schedule, caps) before expensive providers go live

### Growth Opportunity (planned)

SEO, GEO, website, leads, and later ads must not each invent a different recommendation shape.

A Growth Opportunity is one reviewable item: source module, title, evidence, recommended action, expected impact, confidence, effort, cost, urgency, status, and later measured result. Next step remains the owner review surface. Module pages stay for detail.

Reuse or extend `growth_actions` and Decision History where that is enough. Do not add a parallel coordinator.

### Revenue-aware SEO (planned)

High search volume is not success. A smaller keyword that creates customers and revenue can outrank a popular keyword that creates visits and no customers. Opportunity scoring must be able to include demand, feasibility, intent, business relevance, conversion, revenue, and strategic fit. The formula stays configurable. Facts, estimates, and AI inference must stay labeled.

### AI Visibility / GEO (planned)

SEO = visibility in traditional search. AI Visibility = visibility when people ask AI systems for recommendations, comparisons, or who to hire.

Monitor through **provider adapters**. Do not hard-code business logic to a fixed vendor list. Before any automated monitoring: confirm API, terms, rate limits, cost, and whether querying is allowed. Never scrape to fake the feature.

AI answers vary. Store history and show trends. Do not treat one run as truth.

### Content and publishing (planned)

Content type must match intent and the Goal. Not every keyword needs a blog post. Default is review-first: recommend only, draft, require approval, schedule after approval. Auto-publish is an explicit owner choice.

Never fabricate ratings, reviews, prices, addresses, or other schema facts. Content is for humans first.

### First coding slice after these docs

Turn **existing** Search Console top queries and **existing** SEO check findings into Growth Opportunities the owner can see on Next step and Intelligence. Recommend only. No new paid API. No content factory. No AI-platform scraping. No live-site edits.

## 16. Human control and cost

Autonomy stays: 1 Observe · 2 Recommend · 3 Draft · 4 Execute after approval · 5 Guarded autopilot · 6 Future.

High-impact or hard-to-reverse actions stay approval-gated unless the owner explicitly authorizes them.

SEO, GEO, and content scans can cost more than hosting. Architect caching, batching, weekly (not continuous) scans, active/paused queries, model choice, and per-organization budgets **before** turning paid providers on. Do not re-run expensive analysis when the underlying data has not changed.

Credentials stay in Vercel or equivalent secret storage. Never commit them. This repository is public. Use minimum scopes. Search Console stays read-only until a later approved write adapter exists.

## 17. The differentiator

GroovGro must not optimize a metric only because it is easy to measure.

More impressions, clicks, traffic, content, or AI mentions are not automatically success.

The question remains: **did this help the business grow?**

Connect activity, over time, to qualified people, customers, revenue, and a Goal. SEO Intelligence and AI Visibility are important parts of that system. They are not the entire system.

## 18. Documentation

When this vision changes, update the canonical files: this brief, [v2/ARCHITECTURE.md](v2/ARCHITECTURE.md), [STATUS.md](STATUS.md), [AGENTS.md](../AGENTS.md), and any Phase 0 note that would otherwise contradict them. Do not add a second SEO brief. Distinguish **implemented**, **partially implemented**, and **planned**.
