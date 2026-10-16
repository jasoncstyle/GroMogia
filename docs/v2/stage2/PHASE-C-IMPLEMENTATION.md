# Stage 2 Phase C — Structured Business Brain

Implemented on `cursor/stage2-phase-c-a329`. This is the Fact / Observation / Source / Contradiction store and Fact-Use Gate. It is **not** MVBB, ODQ, Worker Gateway, or a five-screen rebuild.

Authoritative design: Drive `02-DOMAIN-MODEL-AND-DATA.md`, `03-BUSINESS-BRAIN.md`, `05-PERMISSIONS-AND-AUTHORITY.md`, `09-QA-AND-AUDIT.md`, `12-MIGRATION-STRATEGY.md`, `14-ACCEPTANCE-TESTS.md`, Skill v1.3.

## 1. New entities and services

| Entity | Table | Role |
| --- | --- | --- |
| Source / provenance | `brain_sources` | S1–S6 class, domain the source may own, locator, recorded time. No tokens. |
| Intake item | `brain_intake_items` | Discovery writes intake first. Legacy Brain snapshots land here. |
| Observation | `brain_observations` | What an authorized source displayed. Not a fact. |
| Fact | `brain_facts` | Assertion with value, status, risk, freshness, scope, provenance. |
| Fact history | `brain_fact_history` | Previous values, status, source; created / status_change / owner_correction / supersession. |
| Contradiction | `brain_contradictions` + `brain_contradiction_members` | OPEN / RESOLVING / NARROWED / RESOLVED / NO_LONGER_RELEVANT. |
| Relationship | `brain_relationships` | Connections among businesses, brands, offerings, people, locations. Related businesses do not inherit facts. |

Services: `src/lib/brain/` (`types`, `authority`, `gate`, `store`, `compatibility`, `queries`, `audit`).

## 2. Existing systems reused

- `organizations` as tenant root (`organization_id` = Stage 2 `business_id`)
- `business_brains` owner-facing store (dual-read)
- `offers` as offering scope (`brain_facts.offering_id`)
- `growth_goals` and Brand Voice stay canonical; not duplicated
- `audit_events` for material Brain events
- `assertSameOrganization` in every new accessor
- Execute / CMS adapters stay off

## 3. Database migration

Additive file: `drizzle/0047_brain_facts.sql`. Journal entry `0047_brain_facts`. `ensure-schema.ts` applies it when `brain_facts` is missing.

Does not alter or drop `business_brains`, offers, goals, Clerk, or integrations.

## 4. Compatibility strategy

Owner screens continue to read `business_brains` through `getGrowthSnapshot`. Structured facts are **not** merged into those screens.

`snapshotLegacyBrain` is an explicit copy into intake + observations + facts. It never sets VERIFIED. Legacy `confidence` is ignored as trust. `discoveryStatus = confirmed` is not an S1 source record.

Future cutover steps live in `FUTURE_BRAIN_MIGRATION_STEPS` and [PHASE-C-MIGRATION.md](PHASE-C-MIGRATION.md). Harbor / Albatross / MBSS Markdown importers wait for Phase G.

## 5. Fact-Use Gate

`evaluateFactUse` checks status, source authority, risk, freshness, scope/coverage, contradictions, provenance, and intended use.

Default: withhold consequential use when evidence or authority is missing.

HIGH-risk PROVISIONAL facts may be stored and used for internal investigation. They are not authoritative for customer-facing claims, prices, availability, credentials, policy, spend, or commitments.

The gate **never** grants publish, send, spend, or external change. That authority stays with later two-gate Permission Grants (Phase E) and adapters that remain off.

Observations are evaluated separately: verifying that a page displayed a claim does not verify the underlying fact (AT-FACT-02).

## 6. Tenant isolation

Every new table has `organization_id NOT NULL`, FK cascade to `organizations`, and an org index. `MemoryBrainStore` and `src/lib/brain/queries.ts` call `assertSameOrganization`. Related-business links do not copy facts.

## 7. Audit and supersession

Audit actions: `brain.fact.created`, `brain.fact.status_changed`, `brain.fact.owner_corrected`, `brain.fact.superseded`, `brain.contradiction.created`, `brain.contradiction.resolved`, `brain.fact_use_gate.material`.

Supersession keeps the previous row, marks it SUPERSEDED, and links `superseded_by_fact_id` / `supersedes_fact_id`. Original evidence stays on observations.

Facts cannot be created as VERIFIED. Promotion is explicit and domain-checked.

## 8. Tests

`src/lib/brain/brain.test.ts` covers AT-FACT-01–04, isolation, statuses, source classes, domain authority, high-risk provisional, freshness, contradictions, supersession, legacy snapshot, no auto-VERIFIED, no new external action, and owner-screen jargon fences.

## 9. Known limitations

- No production migrate in this PR.
- Owner UI does not display Facts (intentional).
- Exact freshness TTLs remain deferred.
- Brain Person / Location are scope labels on facts, not CRM tables.
- OwnerDecision / ODQ / MVBB are Phase D.
- PermissionGrant / two-gate is Phase E.
- Markdown importers are Phase G.

## 10. Production migration

See [PHASE-C-MIGRATION.md](PHASE-C-MIGRATION.md). Not applied.

## 11. A3 / A4

Remain OFF. `executionEnabled()` is false. `requestExecute` returns `{ status: "off" }`. The Fact-Use Gate does not grant external actions.
