/**
 * Phase C persistence readiness. MemoryBrainStore is the in-process
 * reference implementation used by unit tests. Durable reads and writes
 * go through queries.ts and persist.ts. Phase D must use persist.ts, not
 * MemoryBrainStore, for stored facts.
 */
export const PHASE_C_PERSISTENCE = {
  memoryReference:
    "MemoryBrainStore — in-process reference behavior and unit tests. Not production persistence.",
  durableReads:
    "queries.ts — organization-scoped list/get. Lookups always include organization_id in the query.",
  durableWrites:
    "persist.ts — create/update for sources, intake, observations, facts, history, contradictions, and relationships. Same status-transition, audit, and tenant rules as MemoryBrainStore.",
  phaseDMayDependOnDurableWrites: true,
  memoryIsNotProductionPersistence: true,
} as const;
