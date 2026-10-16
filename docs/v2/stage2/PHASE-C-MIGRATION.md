# Stage 2 Phase C — production migration runbook

**Status: not applied.** This PR only adds the migration file. Do not run it against production Neon until the owner approves a separate migrate step.

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

No data copy. No `business_brains` rewrite. No VERIFIED promotion. Offers, goals, Brand Voice, Clerk, integrations, CRM, and `growth_actions` are untouched.

## Isolated validation (this branch)

1. Confirm the SQL is CREATE TABLE / ALTER TABLE ADD CONSTRAINT / CREATE INDEX only.
2. Confirm every CREATE TABLE includes `"organization_id" uuid NOT NULL`.
3. Confirm there is no `DROP TABLE` and no `ALTER TABLE "business_brains"`.
4. Run unit tests in `src/lib/brain/brain.test.ts`.
5. Do **not** run `drizzle-kit migrate` against production.

A local or preview database may apply `0047_brain_facts.sql` after `0046_scheduled_jobs`. Preview deploys for `cursor/**` do not auto-deploy (git.deploymentEnabled).

## Production rollout (later, owner-approved)

1. Backup Neon (point-in-time is already on).
2. Apply `0047_brain_facts.sql` via the usual `drizzle-kit migrate` / `ensureSchema` path on a preview first, then production after merge to `main`.
3. Smoke: existing `/app/business` still loads `business_brains`. New tables exist and are empty.
4. Do **not** run `snapshotLegacyBrain` in production until a later explicit job. Snapshot is opt-in and still must not mark VERIFIED.

## Rollback

Safe while the new tables are unused (Phase C default):

```sql
DROP TABLE IF EXISTS brain_relationships;
DROP TABLE IF EXISTS brain_contradiction_members;
DROP TABLE IF EXISTS brain_contradictions;
DROP TABLE IF EXISTS brain_fact_history;
DROP TABLE IF EXISTS brain_facts;
DROP TABLE IF EXISTS brain_observations;
DROP TABLE IF EXISTS brain_intake_items;
DROP TABLE IF EXISTS brain_sources;
```

`business_brains` and all prior tables remain. After snapshots exist, rollback would drop copied intake/facts only; the owner-facing Brain is unchanged.

## Future content migration (not this PR)

See `FUTURE_BRAIN_MIGRATION_STEPS` in `src/lib/brain/compatibility.ts`. Historical unknowns stay unknown. Owner-confirmed form values keep Stage 2 authority only after an S1 source record exists. Markdown Harbor / Albatross / MBSS importers wait for Phase G.
