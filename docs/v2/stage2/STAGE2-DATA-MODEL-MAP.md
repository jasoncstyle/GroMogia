# Stage 2 — Data model map

Classification for Phase A only. **Do not create these tables in this phase.**

Legend: **EXISTING TABLE SUFFICIENT** · **EXISTING TABLE — EXTEND** · **NEW TABLE / ENTITY NEEDED** · **DERIVED / NO TABLE REQUIRED** · **DEFERRED**

`organization_id` in this repo is the Stage 2 `business_id`. Keep that name unless a later migration explicitly renames. Do not add a second tenant root.

| Stage 2 entity | Classification | Current table / notes | Later phase |
| --- | --- | --- | --- |
| **Business / Organization** | **EXISTING TABLE — EXTEND** | `organizations` (+ slug, name). Add readiness / MVBB flags when D lands — or store on a 1:1 `business_readiness` row to avoid stuffing orgs. | D |
| **Brand** | **EXISTING TABLE SUFFICIENT** (for now) | `brand_settings`. Brand/location **scope on Facts** is new (C). | C (scope on Fact), not a new Brand table |
| **Fact** | **NEW TABLE / ENTITY NEEDED** | Flat `business_brains` fields are **not** Facts. | C |
| **Fact History** | **NEW TABLE / ENTITY NEEDED** | Prefer record-level history + SUPERSEDES links, not document versions. | C |
| **Observation** | **NEW TABLE / ENTITY NEEDED** | Website page text / competitor looks are evidence, not Facts. May start from `website_discovered_pages` as source material only. | C |
| **Relationship** | **NEW TABLE / ENTITY NEEDED** | Related businesses must not inherit Facts. | C |
| **Offering** | **EXISTING TABLE — EXTEND** | `offers` is the seed. Link as Fact subjects; add type enum if needed. Do not duplicate into a second catalog. | C |
| **Person** | **EXISTING TABLE — EXTEND** (staff) | `contacts` / `customers` / `users` are CRM/auth, not Brain people. Brain Person (instructor, spokesperson) is **NEW** if needed; do not overload CRM. | C or DEFERRED if unused |
| **Location** | **EXISTING TABLE — EXTEND** | `business_brains.locations` JSON. Promote to rows when Facts need scope. | C |
| **Business Objective** | **EXISTING TABLE — EXTEND** | `growth_goals` (+ snapshots). Link; do not replace. | C / D |
| **Brand Voice Profile** | **EXISTING TABLE — EXTEND** | `brand_voice_profiles`, `brand_voice_examples`. Add status (PROVISIONAL vs approved). | C |
| **Source** | **NEW TABLE / ENTITY NEEDED** | No S1–S6. Provenance hints exist on some SEO rows only. | C |
| **Contradiction** | **NEW TABLE / ENTITY NEEDED** | None. | C |
| **Owner Decision** | **EXISTING TABLE — EXTEND** | `decision_records` can seed **some** owner decisions. Stage 2 OwnerDecision (Brain-facing) may be a new table so Growth Memory stays separate. | C or G — **see conflict OD-3** |
| **Owner Question** | **NEW TABLE / ENTITY NEEDED** | Not `notifications`. | D |
| **Attention Item** | **NEW TABLE / ENTITY NEEDED** | Distinct from questions. Notifications may *present* them. | D |
| **Connection** | **EXISTING TABLE — EXTEND** | `integration_connections` (`status`, `scopes`, `secretRef`, `expiresAt`, `lastSyncAt`). Map health enum. | E |
| **Connection Resource** | **NEW TABLE / ENTITY NEEDED** | GSC property / GA4 property / Stripe account must be explicit per business. Today some IDs live on connection rows or website records. Unique org+provider is too coarse for multi-property Google accounts. | E |
| **Permission Grant** | **NEW TABLE / ENTITY NEEDED** | User RBAC in `permissions` / `roles` stays. Product grants (READ/PREPARE/PUBLISH…) are a different axis. | E |
| **Capability Readiness** | **NEW TABLE / ENTITY NEEDED** | Modules (`organization_modules`) are feature flags, not Stage 2 capability readiness. | D |
| **Job** | **DERIVED / NEW** | `growth_actions` may remain the owner-visible job; orchestration Job is new in F. | F |
| **Job Package** | **NEW TABLE / ENTITY NEEDED** | `seo_proposal_packs` / `bot_proposal_packs` are not the JP schema. Keep packs as artifacts; add JP. | F |
| **Worker Run** | **NEW TABLE / ENTITY NEEDED** | Dispatch/result. Bot POST today writes packs only. | F |
| **QA Review** | **NEW TABLE / ENTITY NEEDED** | No independent activation QA table. | F (activation QA may stub in D) |
| **Action Ledger Entry** | **EXISTING TABLE — EXTEND** | `growth_actions`. Additive columns (authority, risk class, skill/version, before/after, measurement window, action_class). Do not add `growth_opportunities`. | G |
| **Growth Memory Entry** | **EXISTING TABLE — EXTEND** or **NEW** | `decision_records` is the seed. Prefer **new** `growth_memory_entries` if decisions are also OwnerDecisions — see OD-3. | G |
| **Audit Event** | **EXISTING TABLE — EXTEND** | `audit_events`. Add event types; never put tokens in payloads. | All |
| **Onboarding Run / metrics** | **NEW TABLE / ENTITY NEEDED** | No RUN START / TIME TO MVBB. | D |
| **Intake Item** | **NEW TABLE / ENTITY NEEDED** | Discovery writes intake first. | C |
| **Question Group** | **NEW TABLE / ENTITY NEEDED** | Duplicate prevention. | D |
| **HardLimitFidelityCheck** | **NEW TABLE / ENTITY NEEDED** | None. | F |
| **Data Request** | **NEW TABLE / ENTITY NEEDED** | None. | F |
| **Migration Job** | **NEW TABLE / ENTITY NEEDED** | Markdown importers. | G |
| **Playbook (cross-tenant)** | **DEFERRED** | Product Phase 4. Do not start. | — |
| **Website Truth Skill** | **DEFERRED** | Out of Stage 2 build. | — |

## Additive vs new

- **Additive on existing:** `organizations` (or 1:1 readiness), `offers`, `growth_goals`, `brand_voice_profiles`, `integration_connections`, `growth_actions`, `audit_events`.  
- **New families:** Brain facts/observations/sources/contradictions/intake (C); ODQ + MVBB + onboarding run (D); connection_resources + permission_grants (E); job_packages + worker_runs + qa_reviews (F); growth_memory if split (G).  
- **Do not drop** `business_brains` in C. Snapshot and dual-read until Facts back every used field.

## Isolation rule

Every new table: `organization_id` not null, FK cascade, index, `assertSameOrganization` in accessors. Same tests as `tenant.test.ts`.
