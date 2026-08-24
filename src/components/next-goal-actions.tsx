"use client";

import {
  activateDraftGoal,
  draftNextGoalFromReachedGoal,
} from "@/lib/actions/next-goal";
import { SaveButton, SaveForm } from "@/components/save-form";

export function DraftNextGoalButton({
  goalId,
  disabled,
}: {
  goalId: string
  disabled?: boolean
}) {
  return (
    <SaveForm
      action={draftNextGoalFromReachedGoal}
      successMessage="Draft Goal saved. GroovGro will not start marketing."
    >
      <input type="hidden" name="goalId" value={goalId} />
      <SaveButton disabled={disabled} pendingLabel="Drafting…">
        Draft the next Goal
      </SaveButton>
    </SaveForm>
  );
}

export function ActivateGoalButton({
  goalId,
  disabled,
}: {
  goalId: string
  disabled?: boolean
}) {
  return (
    <SaveForm
      action={activateDraftGoal}
      successMessage="This is now the active Goal. GroovGro will not start marketing."
    >
      <input type="hidden" name="goalId" value={goalId} />
      <SaveButton disabled={disabled} pendingLabel="Updating…">
        Make this the active Goal
      </SaveButton>
    </SaveForm>
  );
}
