# GroovGro — Project Master Brief

**Version 2.0 — Goal-Driven Growth Architecture**

Source of truth for product intent. Architecture and implementation must follow this document unless a later approved decision supersedes it. The V1 brief is archived at [MASTER_BRIEF_V1.md](MASTER_BRIEF_V1.md). The first V2 implementation notes are in [v2/ARCHITECTURE.md](v2/ARCHITECTURE.md).

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

V2 layer:

BUSINESS OBJECTIVE → GROWTH PLAN → MARKETING ACTIONS → CUSTOMER RESPONSE → BUSINESS OUTCOME → LEARNING → NEXT ACTION

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

Isolate per organization: users, roles, websites, customers, leads, marketing data, integrations, analytics, AI context, Business Brain, Brand Voice, assets, events, settings, goals, plans, actions, decision history, billing, and audit history.

## 5. Business Brain

Every organization develops a structured Business Brain. It is the shared source of organizational context. It may contain identity, offers, customers, brand, constraints, and performance.

Use structured data. Do not represent the Business Brain solely as an AI prompt or vector store. Store confidence and source where inference is used. Owners can correct GroovGro.

Discovery flow: DISCOVER → INFER → ASK → CONFIRM → LEARN. AI inference must not silently become authoritative when uncertainty is meaningful.

## 6. Offers, availability, and constraints

An Offer is what an organization promotes, sells, provides, or wants customers to act upon. It is not assumed to be a physical product.

Availability is optional and generalized: inventory, capacity, schedule, resource, workload, time window, externally determined, or unconstrained. Organizations may use several at once.

## 7. Growth Goals, Plans, Actions, and Decision History

Goals are first-class measurable outcomes. Plans are versioned strategies for a Goal. Do not overwrite meaningful historical strategy.

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

## 13. Operating principle

**Continuously observe without continuously interfering.**

More activity is not inherently better. More changes are not inherently better. The objective is better business outcomes.

North star: *What is this business trying to accomplish, and based on sufficient evidence, what should happen next to increase the probability of achieving it?*

Sometimes the correct answer is: nothing yet. Keep collecting evidence.

## 14. Development

Cloud-first. GitHub is the source of truth. Production is Vercel, not a laptop. Public repository: never commit secrets. TypeScript, strong typing, modular files, tests for critical logic, migrations, documented env vars.

Current implementation checkpoint: [STATUS.md](STATUS.md).
