/**
 * CMS publishing architecture.
 *
 * Phase P stores an owner-entered review queue from a workspace draft.
 * `requestCmsPublish` exists and stays off. GroovGro does not publish,
 * write a live site, or resume the paused website builder.
 * Do not hard-code a CMS vendor list in business logic.
 */

export const CMS_EVIDENCE_OWNER = "owner";
export const CMS_EVIDENCE_ADAPTER = "adapter";

export type CmsEvidenceSource =
  | typeof CMS_EVIDENCE_OWNER
  | typeof CMS_EVIDENCE_ADAPTER;

/** A workspace draft the owner wants to review before any later publish. */
export type CmsPublishRequestShape = {
  organizationId: string
  draftId: string
  title: string
  source: CmsEvidenceSource
};

export function isOwnerCmsEvidence(source: string): boolean {
  return source === CMS_EVIDENCE_OWNER;
}
