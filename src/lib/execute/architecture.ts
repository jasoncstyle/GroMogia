/**
 * Carefully expanded execution architecture.
 *
 * Phase T stores an owner-entered later-run queue from approved work.
 * `requestExecute` exists and stays off. GroovGro does not run the work,
 * buy ads, send email, post to social, change checkout, or turn on
 * Growth Director. Do not hard-code a vendor list in business logic.
 */

export const EXECUTION_EVIDENCE_OWNER = "owner";
export const EXECUTION_EVIDENCE_ADAPTER = "adapter";

export type ExecutionEvidenceSource =
  | typeof EXECUTION_EVIDENCE_OWNER
  | typeof EXECUTION_EVIDENCE_ADAPTER;

/** Approved work the owner wants GroovGro to remember for a later run. */
export type ExecutionRequestShape = {
  organizationId: string
  actionId: string
  title: string
  source: ExecutionEvidenceSource
};

export function isOwnerExecutionEvidence(source: string): boolean {
  return source === EXECUTION_EVIDENCE_OWNER;
}
