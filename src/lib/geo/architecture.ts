/**
 * GEO / AI Visibility architecture.
 *
 * Phase L stores owner-entered notes only. The query library (M),
 * measurement history (N), and GEO audits (O) stay planned.
 * Adapters stay off. GroovGro does not scrape AI answers.
 * Do not add a hard-coded vendor list to business logic.
 */

export const GEO_EVIDENCE_OWNER = "owner";
export const GEO_EVIDENCE_ADAPTER = "adapter";
export const GEO_EVIDENCE_ESTIMATE = "estimate";

export type GeoEvidenceSource =
  | typeof GEO_EVIDENCE_OWNER
  | typeof GEO_EVIDENCE_ADAPTER
  | typeof GEO_EVIDENCE_ESTIMATE;

/** Later M: a question the business cares about. Not a live query in this slice. */
export type GeoQueryShape = {
  organizationId: string
  query: string
  queryKey: string
  source: GeoEvidenceSource
};

/** Later N: whether a stored answer mentioned or cited the business. */
export type GeoMentionShape = {
  organizationId: string
  queryKey: string
  mentioned: boolean | null
  cited: boolean | null
  source: GeoEvidenceSource
};

export function isOwnerGeoEvidence(source: string): boolean {
  return source === GEO_EVIDENCE_OWNER;
}
