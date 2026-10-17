export const BRAIN_AUDIT_ACTIONS = {
  factCreated: "brain.fact.created",
  factStatusChanged: "brain.fact.status_changed",
  factOwnerCorrected: "brain.fact.owner_corrected",
  factSuperseded: "brain.fact.superseded",
  contradictionCreated: "brain.contradiction.created",
  contradictionResolved: "brain.contradiction.resolved",
  factUseGateMaterial: "brain.fact_use_gate.material",
} as const;

export const BRAIN_AUDIT_TARGET_TYPES = {
  fact: "brain_fact",
  contradiction: "brain_contradiction",
  observation: "brain_observation",
  gate: "brain_fact_use_gate",
} as const;
