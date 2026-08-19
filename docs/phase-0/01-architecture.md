# Technical architecture and initial stack

GroovGro is a **multi-tenant modular SaaS monolith** hosted on Vercel. Cursor develops it. GitHub stores it. Vercel, Neon, Clerk, Stripe, Resend, and Blob operate it.

This matches the brief’s preference for a well-structured modular monolith (§35) and the constraint that production must run when any local computer is off (§21–22).

## System context

```text
                    ┌─────────────────────────────────────────┐
                    │           Cursor Cloud Agent            │
                    │         (development only)              │
                    └──────────────────┬──────────────────────┘
                                       │ PRs / commits
                                       ▼
                                 GitHub (source of truth)
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
            Vercel Preview                         Vercel Production
            (every PR)                             (main after approval)
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        ▼              ▼               ▼               ▼              ▼
     Clerk          Neon           Stripe           Resend      Vercel Blob
     identity     Postgres        payments          email         media
                                       │
                                       ▼
                          External adapters (Phase 2+)
                     SiteGround / WordPress, Google, Meta,
                     existing OSA Stripe booking, later Mailchimp, etc.
```

Cursor is never in the production path.

## Recommended initial stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js App Router, TypeScript | UI + API in one deployable unit. Native on Vercel. |
| Runtime | Node.js on Vercel Fluid Compute | Webhooks, cron, streaming, AI. Do not default to Edge runtime. |
| UI | React, Tailwind CSS, shadcn/ui | Professional, fast for agents to extend, accessible patterns. |
| Auth | Clerk (Vercel Marketplace) | Hosted identity, sessions, MFA. GroovGro still owns orgs, roles, and entitlements in Postgres. |
| Database | Neon Postgres (Vercel Marketplace) | Cloud Postgres, branching later if useful, no laptop database. |
| ORM / migrations | Drizzle ORM + Drizzle Kit | SQL-shaped, typed, reviewable migrations in git. |
| Validation | Zod | Shared input validation for forms, APIs, and webhooks. |
| Payments | Stripe | Brief requirement. Never store cards. Use Checkout / Billing / webhooks. |
| Email | Resend behind an `EmailProvider` adapter | Brief requirement, swappable for Mailchimp later. |
| Files | Vercel Blob | Tenant-keyed object storage. No local disk. |
| Jobs | Vercel Cron for schedules; Vercel Workflow for durable multi-step jobs; Functions for webhooks | Cloud-native, retryable, no always-on worker on a laptop. |
| AI | Vercel AI SDK + AI Gateway | Provider-flexible. Intelligence layer, not a chatbot product. |
| Feature flags | Database-backed flags in GroovGro | Enough for Mogia Group / beta / plan targeting. No extra vendor in Phase 1. |
| Observability | Vercel logs + structured JSON logs in-app | Add a dedicated error tracker later if noise requires it. |
| Package manager | npm, Node 22 | Already available in Cloud Agents. |

Explicitly **not** in v1: Expo/mobile, microservices, local Postgres, ngrok as the real webhook path, unrestricted website canvas, LaunchDarkly, a separate Express API.

## Application surfaces

Three surfaces in one Next.js app (route groups), not three services:

| Surface | Audience | Example routes |
| --- | --- | --- |
| Marketing site | Public | `groovgro.com` |
| Organization app | Org users | `groovgro.com/app` — dashboard, modules, settings |
| Platform admin | Mogia Group super admins only | `groovgro.com/platform` — orgs, flags, health |

Tenant-built public websites (Phase 7) are a later hosting decision. Until then, organizations **connect** existing SiteGround / WordPress / other sites.

## Modular monolith layout

Modules are packages of UI, domain logic, and jobs **inside one deploy**. Enabling a module is an entitlement + navigation + job registration problem, not a new server.

```text
apps are not split. One Next.js app:

src/
  app/
    (marketing)/          public marketing pages
    (app)/                authenticated org app
    (platform)/           Mogia Group admin
    api/                  webhooks, cron, public forms
  modules/
    core/                 orgs, users, rbac, flags, audit, notifications
    brand/
    integrations/
    website-connect/      Phase 2: connect existing site
    website-builder/      Phase 7
    events/
    crm/                  contacts, leads, customers
    commerce/             bookings, Stripe
    marketing/
    analytics/
    seo/
    reviews/
    intelligence/         AI layer
    billing/
  lib/
    db/                   Drizzle client, schema, tenant scoping
    auth/
    jobs/
    email/                EmailProvider adapter
    storage/
    logging/
```

A module may be present in the codebase while **disabled** for an organization. UI, APIs, and jobs must check entitlements.

## Data → insight pipeline (product principle §39)

Every module that stores facts should eventually emit **normalized events** into an organization-scoped activity/attribution model:

```text
Source system  →  Adapter  →  Canonical records  →  Insight queries  →  UI / AI
(Stripe, WP, ads)             (contact, booking,     (funnels,         (dashboard,
                               spend, session)        changes)          recommendations)
```

Phase 1 builds the rails (org, auth, modules, audit). Phase 2 lands the first canonical records. Phase 3 connects attribution. Phase 4 puts AI on those records.

## Deployment / cloud architecture

| Concern | Production choice |
| --- | --- |
| App hosting | Vercel Production from `main` |
| Preview | Vercel Preview from every PR (this is how “always deploy” works) |
| Database | Neon; separate production vs preview/dev databases or branches |
| Auth | Clerk production vs development instances |
| Secrets | Vercel env (Preview / Production) + Cursor Cloud Agent secrets for development |
| Domains | `groovgro.com` (current); optional `app.groovgro.com` later |
| Cron | Vercel Cron hitting authenticated route handlers |
| Webhooks | Stripe (and later Google/Meta) → Vercel URLs only |
| Backups | Neon PITR / backups; do not rely on a laptop dump |
| Monitoring | Vercel deployment and runtime logs |

If a future job is too long, too chatty, or needs a specialized runtime, extract **that job** to a managed worker — not the whole platform.

## Repository / folder structure (target after Phase 1)

```text
/
  AGENTS.md
  README.md
  package.json
  drizzle.config.ts
  vercel.ts
  .env.example
  .cursor/environment.json
  docs/
    MASTER_BRIEF.md
    phase-0/                  this planning set
    decisions/                later ADRs
  src/                        application (see above)
  drizzle/                    SQL migrations
```

Until Phase 1 is approved, this repository correctly contains **docs and agent configuration only**.

## What this architecture refuses

- A production dependency on Cursor Desktop or a home computer
- Schema-per-tenant or database-per-tenant for v1 (see [04-data-model.md](04-data-model.md))
- Rebuilding Stripe, WordPress, or Google Analytics
- Sailing-specific tables
- AI that can change customer systems without an automation level and an audit log
