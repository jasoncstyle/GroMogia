"use client";

import { createSeoDrafts, decideSeoDraft, runSeoAudit } from "@/lib/actions/seo";
import { CopyText } from "@/components/copy-text";
import { SaveButton, SaveForm } from "@/components/save-form";

export function RunHomepageSeoButton({ disabled }: { disabled?: boolean }) {
  return (
    <SaveForm
      action={runSeoAudit}
      successMessage="Check saved. GroovGro did not change the website."
    >
      <SaveButton type="submit" disabled={disabled} pendingLabel="Checking…">
        Run homepage check
      </SaveButton>
    </SaveForm>
  );
}

export function DraftSeoImprovementsButton({ disabled }: { disabled?: boolean }) {
  return (
    <SaveForm
      action={createSeoDrafts}
      successMessage="Drafts ready to approve. GroovGro did not change the website."
    >
      <SaveButton type="submit" disabled={disabled} pendingLabel="Drafting…">
        Draft improvements
      </SaveButton>
    </SaveForm>
  );
}

export function SeoDraftDecisionButtons({
  draftId,
  proposedChange,
  disabled,
}: {
  draftId: string
  proposedChange: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <CopyText text={proposedChange} label="Copy draft" />
      <SaveForm action={decideSeoDraft} successMessage="Approved. GroovGro did not change the website.">
        <input type="hidden" name="draftId" value={draftId} />
        <input type="hidden" name="decision" value="approved" />
        <SaveButton size="sm" disabled={disabled}>
          Approve
        </SaveButton>
      </SaveForm>
      <SaveForm
        action={decideSeoDraft}
        successMessage="Marked as do not approve. GroovGro did not change the website."
      >
        <input type="hidden" name="draftId" value={draftId} />
        <input type="hidden" name="decision" value="rejected" />
        <SaveButton size="sm" variant="outline" disabled={disabled}>
          Do not approve
        </SaveButton>
      </SaveForm>
    </div>
  );
}
