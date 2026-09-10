# Phase 0 — inspect, design, document, recommend

This folder is the **historical** architecture and planning deliverable. Phase 1–7 and V2 owner-assistance are already on `main`.

**Current product intent:** [MASTER_BRIEF.md](../MASTER_BRIEF.md) v2.1.  
**What V2 built, and the SEO / content / GEO expansion:** [v2/ARCHITECTURE.md](../v2/ARCHITECTURE.md).  
**Live checkpoint:** [STATUS.md](../STATUS.md).

Do not implement new work from this folder alone when those documents disagree. Phase 0 still explains tenancy, modules, adapters, and the original phase numbers.

This folder is not the product. No customer data is stored, no payments are taken, and no website is published from these files.

## Brief §41 checklist

| # | Required output | Document |
| --- | --- | --- |
| 1–4 | Review spec, inspect repo, identify stack, preserve existing work | [00-inspection.md](00-inspection.md) |
| 5–6 | Technical architecture and initial stack | [01-architecture.md](01-architecture.md) |
| 7 | Major modules | [03-modules.md](03-modules.md) |
| 8–9 | Initial database schema and tenant isolation | [04-data-model.md](04-data-model.md) |
| 10, 16 | Auth, authorization, security | [05-auth-security.md](05-auth-security.md) |
| 11–13 | Integrations, background jobs, AI | [06-integrations-jobs-ai.md](06-integrations-jobs-ai.md) |
| 14–15 | Deployment and repository structure | [01-architecture.md](01-architecture.md), [07-environment-and-secrets.md](07-environment-and-secrets.md) |
| 17–19 | Roadmap, expensive decisions, spec changes | [08-roadmap-and-decisions.md](08-roadmap-and-decisions.md) |
| 20 | Stop after planning | This PR. No application implementation. |

Also:

- [Operating model](02-operating-model.md) — how you, Cursor, GitHub, and Vercel work together
- [What you need to do](09-user-actions.md) — steps only you can take

## Decision requested

Please reply with:

1. **Approve** this platform architecture, or name the changes you want.
2. Confirm you will complete the actions in [09-user-actions.md](09-user-actions.md), especially connecting this GitHub repository to Vercel (required for “always deploy”).
3. Confirm the first real test business is **Ocean Sailing Adventures** (Stripe booking system already exists), or name a different Mogia Group business.

**Historical close.** Phase 1 already shipped. New work follows the v2.1 brief (phases A–T). This folder stays as the original platform plan.
