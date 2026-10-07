# Stage 2 — Current → target map

Inspected `main` @ `3745f55`. Stage 2 systems from `00-IMPLEMENTATION-OVERVIEW.md` and `01-PRODUCT-ARCHITECTURE.md`.

| Stage 2 system | Answers | Current seed | Class | Target |
| --- | --- | --- | --- | --- |
| **Business Brain** | What is currently true? | `business_brains` + offers/locations JSON | **PARTIAL** | Fact / Observation / Source / Contradiction / Intake. Do not treat the form as the Fact store. |
| **Growth Memory** | What did we learn from results? | `decision_records` | **EXISTS—MODIFY** | Bounded GM entries. Must not silently rewrite Brain. |
| **Action Ledger** | What was proposed / approved / done / measured? | `growth_actions` + `execution_requests` | **EXISTS—MODIFY** | Additive ledger fields. Execute adapter stays off. |
| **Connections** | Where data comes from; technical access | `integration_connections`, websites, GSC/GA4 OAuth | **EXISTS—MODIFY** | Connection Center, resources, health states, two ladders. |
| **Permissions** | What GroovGro is authorized to do | User RBAC + `autonomy_level` + `approve_*` | **PARTIAL** | Keep RBAC. Add business `PermissionGrant` / template. Two-gate. |
| **Owner Decision Queue** | What needs the owner | Next step, Your work, notifications, Intelligence | **PARTIAL** | Questions vs Attention Items; Retrieve→Need→Consequence→Ask. |
| **Orchestration** | Job Packages, routing, HARD-LIMIT | `next-step.ts`, specialists, bot packs | **PARTIAL** | Structured JP. Coordinator owns queue. No specialist owner-bypass. |
| **QA** | Independent activation / quality gate | Draft checks, proposal inbox | **PARTIAL** | Independent verdicts. QA PASS ≠ execute. |
| **Owner UX** | Front door | ~20-item console | **CONFLICTS** | Home / Grow / Work / Results / Business. |
| **Onboarding** | Learn the business | Connect/setup screens | **CONFLICTS / PARTIAL** | Name, website, optional goal → discovery. MVBB, not a questionnaire. |

## Operating loop

| Stage 2 step | Current equivalent | Gap |
| --- | --- | --- |
| Learn the business | Website read + owner forms | No intake-first discovery run |
| Trustworthy knowledge | Flat Brain fields | Observation collapsed into “notes” |
| Known / unknown | Informal empty fields | No UNKNOWN / PROVISIONAL statuses |
| Connect when useful | Integrations as checkboxes | Not recommended by need; weak resource mapping |
| Growth opportunities | Next step + Intelligence + SEO | Many doors; listed-first factory |
| Coordinate workers | Bot GET/POST + desk | Owner-facing bot names; no JP schema |
| QA the work | Informal draft checks | No independent activation QA |
| Involve owner only when needed | Many remaining-count prompts | No interruption test |
| Act only with authority | A0–A2; A3 off | No explicit two-gate grants |
| Measure / learn | Goal snapshots, before/after, decisions | Not Growth Memory / Ledger boundaries |

## Do not collapse

Brain, Connections, Permissions, Queue, Ledger, Growth Memory, Orchestration, and QA stay separate stores and services — even if the owner sees one partner.
