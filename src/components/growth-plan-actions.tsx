"use client";

import {
  approveGrowthPlan,
  draftGrowthPlanForGoal,
  proposeActionsForApprovedPlan,
  rejectGrowthPlan,
} from "@/lib/actions/growth-plan";
import { SaveButton, SaveForm } from "@/components/save-form";

export function DraftGrowthPlanButton({
  goalId,
  disabled,
}: {
  goalId: string
  disabled?: boolean
}) {
  return (
    <SaveForm
      action={draftGrowthPlanForGoal}
      successMessage="Draft plan saved. GroovGro will not run it."
    >
      <input type="hidden" name="goalId" value={goalId} />
      <SaveButton disabled={disabled} pendingLabel="Drafting…">
        Draft a plan for this Goal
      </SaveButton>
    </SaveForm>
  );
}

export function GrowthPlanReviewButtons({
  planId,
  canApprove,
}: {
  planId: string
  canApprove: boolean
}) {
  if (!canApprove) {
    return (
      <p className="text-xs text-muted-foreground">
        An owner or admin can approve or reject this draft. GroovGro will not
        run it.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <SaveForm
        action={approveGrowthPlan}
        successMessage="Plan approved. GroovGro did not run it."
      >
        <input type="hidden" name="planId" value={planId} />
        <SaveButton pendingLabel="Saving…">Approve plan (do not run)</SaveButton>
      </SaveForm>
      <SaveForm
        action={rejectGrowthPlan}
        successMessage="Plan rejected. GroovGro did not run it."
      >
        <input type="hidden" name="planId" value={planId} />
        <SaveButton variant="outline" pendingLabel="Saving…">
          Reject plan
        </SaveButton>
      </SaveForm>
    </div>
  );
}

export function ProposePlanActionsButton({
  planId,
  disabled,
}: {
  planId: string
  disabled?: boolean
}) {
  return (
    <SaveForm
      action={proposeActionsForApprovedPlan}
      successMessage="Actions proposed. GroovGro will not run them."
    >
      <input type="hidden" name="planId" value={planId} />
      <SaveButton disabled={disabled} pendingLabel="Proposing…">
        Propose the first actions (do not run)
      </SaveButton>
    </SaveForm>
  );
}
