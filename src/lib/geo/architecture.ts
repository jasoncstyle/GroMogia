/**
 * GEO / AI Visibility architecture.
 *
 * Phase L stores owner-entered notes. Phase M stores an owner-entered
 * query library. Phase N stores owner-entered history snapshots.
 * Phase O estimates citation gaps from those snapshots.
 * Adapters stay off. CMS publishing (P) stays planned.
 * GroovGro does not scrape AI answers.
 * Do not add a hard-coded vendor list to business logic.
 */

export const GEO_EVIDENCE_OWNER = "owner";
export const GEO_EVIDENCE_ADAPTER = "adapter";
export const GEO_EVIDENCE_ESTIMATE = "estimate";

export type GeoEvidenceSource =
  | typeof GEO_EVIDENCE_OWNER
  | typeof GEO_EVIDENCE_ADAPTER
  | typeof GEO_EVIDENCE_ESTIMATE;

/** A question the business cares about. Not a live query in this slice. */
export type GeoQueryShape = {
  organizationId: string
  query: string
  queryKey: string
  source: GeoEvidenceSource
};

/** Whether a stored answer mentioned or cited the business. Owner-entered in this slice. */
export type GeoMentionShape = {
  organizationId: string
  queryKey: string
  mentioned: "yes" | "no" | "unsure"
  cited: "yes" | "no" | "unsure"
  source: GeoEvidenceSource
};

/** An estimate from stored history. Not a live AI answer. */
export type GeoAuditShape = {
  organizationId: string
  queryKey: string
  mentioned: "yes" | "no" | "unsure"
  cited: "yes" | "no" | "unsure"
  status: "citation_gap" | "covered"
  source: GeoEvidenceSource
};

export function isOwnerGeoEvidence(source: string): boolean {
  return source === GEO_EVIDENCE_OWNER;
}
