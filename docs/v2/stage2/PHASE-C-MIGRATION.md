# Stage 2 Phase C — production migration runbook

**Production status: not applied. Rollout stays blocked until isolated execution of `0047_brain_facts.sql` is recorded as passing and the owner approves a separate migrate step.**

## What the migration does

File: `drizzle/0047_brain_facts.sql`

Creates eight empty tables, all keyed by `organization_id`:

- `brain_sources`
- `brain_intake_items`
- `brain_observations`
- `brain_facts`
- `brain_fact_history`
- `brain_contradictions`
- `brain_contradiction_members`
- `brain_relationships`

Adds unique `(id, organization_id)` indexes on parent tables (and on `offers`) and composite foreign keys so a Brain row cannot reference another business’s source, fact, observation, intake, offering, or contradiction.

No data copy. No `business_brains` rewrite. No VERIFIED promotion. Offers, goals, Brand Voice, Clerk, integrations, CRM, and `growth_actions` are otherwise untouched (`offers` only gains the unique `(id, organization_id)` index used by the composite FK).

## Isolated validation

SQL-text inspection is **not** sufficient. Run `src/lib/brain/migration.isolated.test.ts`, which:

1. Starts a throwaway PostgreSQL cluster (not Neon production).
2. Applies a minimal `organizations` / `offers` / `business_brains` bootstrap, then `0047_brain_facts.sql`.
3. Asserts all eight tables, composite `*_org_fk` constraints, and tenant indexes exist.
4. Inserts a same-business source→fact (succeeds).
5. Inserts a cross-business source_id and offering_id (rejected by composite FKs).
6. Asserts `business_brains` columns are unchanged.
7. Confirms a naïve re-CREATE of `brain_facts` fails predictably (`already exists`); `ensureSchema` skips when `to_regclass('public.brain_facts')` is set.
8. Rolls back the eight tables (and `offers_id_org_idx`) and re-applies `0047` successfully.
9. Stops and deletes the cluster.

Do **not** run `drizzle-kit migrate` against production from this PR.

## Production rollout (later, owner-approved)

1. Isolated test above is green on this commit.
2. Backup Neon (point-in-time is already on).
3. Apply `0047_brain_facts.sql` via `drizzle-kit migrate` / `ensureSchema` on a preview first, then production after merge to `main`.
4. Smoke: existing `/app/business` still loads `business_brains`. New tables exist and are empty.
5. Do **not** run `snapshotLegacyBrain` in production until a later explicit job.

## Rollback

Safe while the new tables are unused (Phase C default):

```sql
DROP TABLE IF EXISTS brain_relationships;
DROP TABLE IF EXISTS brain_contradiction_members;
DROP TABLE IF EXISTS brain_contradictions;
DROP TABLE IF EXISTS brain_fact_history;
DROP TABLE IF EXISTS brain_observations;
DROP TABLE IF EXISTS brain_facts;
DROP TABLE IF EXISTS brain_intake_items;
DROP TABLE IF EXISTS brain_sources;
DROP INDEX IF EXISTS "offers_id_org_idx";
```

`business_brains` and all prior tables remain. After snapshots exist, rollback would drop copied intake/facts only; the owner-facing Brain is unchanged.

## Persistence

Durable writes live in `src/lib/brain/persist.ts`. `MemoryBrainStore` is not production persistence. Phase D must not depend on the in-memory store.

## Future content migration (not this PR)

See `FUTURE_BRAIN_MIGRATION_STEPS` in `src/lib/brain/compatibility.ts`. Historical unknowns stay unknown. Owner-confirmed form values keep Stage 2 authority only after an S1 source record exists. Markdown Harbor / Albatross / MBSS importers wait for Phase G.
