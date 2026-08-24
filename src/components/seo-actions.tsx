"use client";

import { runSeoAudit } from "@/lib/actions/seo";
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
