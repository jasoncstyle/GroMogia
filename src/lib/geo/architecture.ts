/**
 * GEO / AI Visibility architecture.
 *
 * Phase L stores owner-entered notes. Phase M stores an owner-entered
 * query library. Phase N stores owner-entered history snapshots.
 * Adapters stay off. GEO audits (O) stay planned.
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

export function isOwnerGeoEvidence(source: string): boolean {
  return source === GEO_EVIDENCE_OWNER;
}
