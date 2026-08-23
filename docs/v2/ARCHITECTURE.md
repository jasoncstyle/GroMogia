# V1 → V2 Architecture Change Report

First implementation slice: **V2 growth foundation**. This is not the Growth Director and not autonomous marketing.

V1 checkpoint tag: `pre-v2-architecture-checkpoint` (`7d4c9be`). Compare against that tag to see what V2 actually changed.

## KEEP

No rewrite of working V1:

- Organizations, users, memberships, RBAC, modules, feature flags
- Brand settings, Brand Voice, media, integrations
- Website connection, public lead form, tracking snippet
- Events, CRM, Stripe read-copy payments, attribution touches
- Intelligence observe + recommend
- SEO checks, drafts, Search Console read-only
- Optional website builder (rows, inner rows, chrome, Blob uploads)
- Audit log and notifications
- Coming-soon public homepage

Website builder stays optional. V2’s later “Phase 13 builder” does not mean delete Phase 7 work.

## ADJUST NOW (done in this slice)

### 1. First-class growth tables

**Reason:** V2 §69 says Goals, Offers, constraints, Decision History, Actions, and evidence windows are cheaper to introduce now than later.

**Affected:** `src/lib/db/schema.ts`, `drizzle/0018_v2_growth_foundation.sql`, `src/lib/db/ensure-schema.ts`

**Migration risk:** Additive tables and nullable columns. Existing rows keep working. Preview and production apply the migration on deploy.

**Current functionality:** Unchanged. New nav items appear when modules are enabled (they are on by default, like other foundation modules).

**Approach:** New tables only. No drop/rename of V1 tables.

### 2. Optional Goal / Plan / Offer links on marketing records

**Reason:** V2 wants marketing entities to support `goal_id` and `plan_id` without forcing them.

**Affected:** `lead_records`, `events`, `bookings`, `attribution_touches` — nullable columns.

**Migration risk:** Low. Columns are unused until later forms write them.

**Current functionality:** Event, lead, and Stripe flows do not require the new fields.

### 3. Permissions for goals, offers, plans, actions, and decisions

**Reason:** Action-level authorization must exist before any AI execution.

**Affected:** `src/lib/permissions.ts`, catalog bootstrap.

**Migration risk:** New permission rows inserted with `onConflictDoNothing`. Session still grants the owner role in code.

### 4. Independent modules for Business, Offers, and Goals

**Reason:** V2 remains modular. An organization can use Goals without the website builder.

**Affected:** `src/lib/modules/catalog.ts`, app shell icons.

### 5. Feature-flag Growth Director and automation off

**Reason:** V2 forbids unrestricted autonomy now.

**Affected:** `src/lib/db/bootstrap.ts` flags `growth_director` and `guarded_automation` default false. `v2_growth_foundation` default true.

## BUILD NEXT (after this slice is tested)

- Richer website-page discovery (this slice uses events, bookings, payments, brand, and the connected URL — not a full site scrape)
- Persist computed Goal progress onto stored `currentValue` when you want a historical series

## DESIGN FOR LATER

- Growth Director coordination
- Guarded execution of Actions
- Google Ads / Meta / email / social / reviews
- Capability registry as a formal runtime
- Internal business event bus
- Statistical confidence engine (keep simple thresholds until volume exists)
- Custom domains for builder sites
- Commercial billing

## Current design risks that would have hurt later

| Risk if we had waited | Why it mattered | What we did |
| --- | --- | --- |
| Brand settings as the only “brain” | Brand is presentation; Brain is understanding | New dedicated `business_brains` table; Brand stays |
| Event `capacity` as the only availability | Industry-shaped, only for calendar items | Generalized `availability_constraints` |
| `ai_action_logs` as the Action model | Logs are not approvable work items | New `growth_actions` (proposed only) |
| Intelligence page as the only “what next” | Not goal-linked, easy to become vanity insights | Goals and Decision History are first-class |
| One universal waiting period | SEO vs email vs ads learn at different speeds | `evidence_policies` per channel |

## Industry-specific check

Searched V1 and the new growth schema for seat, boat, student, ticket, sailing as core fields. None added. Events remain a generic calendar. Commerce remains bookings and payments. Test businesses must not dictate generic architecture.

## Integration architecture

Unchanged: provider adapters, capability lists on `integration_providers`, Stripe read-copy only. Growth Director must never assume an unavailable capability. No new providers in this slice.

## AI / authorization boundary

Unchanged rule: AI goes through application services. New Actions cannot execute. Autonomy stored on `growth_settings` and capped at Recommend (level 2) in the save path.

## Cadence representation

`growth_settings` stores review frequency, day, time, and timezone. Evidence policies store waiting thresholds. Weekly and monthly reviews are generated on read from connected data. Saving a review writes Decision History. There is no daily job and no auto-change. Monitoring, analysis, decision, execution, and user review remain separate concepts.

## Evidence windows without a stats engine

A policy is: minimum elapsed days, observations, and conversions. Helper `evidenceRecommendation()` returns `no_change_yet` or `change_allowed`. That is enough until real volume exists.

## What V2 still lacks (important, not in this slice)

- Automatic discovery from the connected website
- Attribution from campaign all the way to a Goal
- Specialist execute path
- Risk guardrail engine beyond stored fields and permissions

## What in V2 is unnecessarily complex for now

- Sixteen overlapping roadmap phases (V1 already built the builder)
- Formal specialist plugin interface
- Full statistical significance engine
- Internal event bus / microservices
- Autonomy levels 5–6
- AI employee personas

## Updated domain model

```
Organization
  ├─ Brand settings (name, description, audience)
  ├─ Business Brain (industry, model, locations, hours, discovery)
  ├─ Growth settings (autonomy, review schedule)
  ├─ Evidence policies (per channel)
  ├─ Offers
  │    └─ Availability constraints (optional)
  ├─ Growth Goals (optional Offer)
  │    ├─ Growth Plans (versioned)
  │    ├─ Decision records
  │    └─ Growth Actions (proposed only)
  └─ V1 records (leads, events, bookings, touches) with optional goal/offer ids
```

## Updated phased roadmap (practical)

1. **Foundation entities and UI.** Done.
2. **Connect live progress** — goals read leads, customers, payments. Done.
3. **Reviews** — weekly / monthly summaries, including no-change. Done in this slice.
4. **Intelligence on goals** — specialists read, analyze, and recommend, including no-change. Done in this slice.
5. **Specialist work with Goal linkage** — SEO and other connected modules recommend; email and ads stay disconnected. Done for recommend-only.
6. **Growth Director** — coordinate, still approval-first.
7. **Guarded automation** — only after the above is trusted.

V1 website builder, SEO, Brand Voice, and Stripe stay available throughout.
