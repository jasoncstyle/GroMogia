"use client";

import Link from "next/link";

import {
  approveGrowthAction,
  rejectGrowthAction,
  saveNextStepResponse,
} from "@/lib/actions/next-step";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";

export function OpenPageNextStepButtons({
  href,
  label,
  canDecide,
}: {
  href: string
  label: string
  canDecide: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <Link href={href}>{label}</Link>
      </Button>
      {canDecide ? (
        <SaveForm
          action={saveNextStepResponse}
          successMessage="GroovGro recorded that nothing should change yet."
        >
          <input type="hidden" name="response" value="leave_alone" />
          <SaveButton variant="outline" pendingLabel="Saving…">
            Leave this alone
          </SaveButton>
        </SaveForm>
      ) : null}
    </div>
  );
}

export function NextStepResponseButtons({
  kind,
  href,
}: {
  kind: "no_change_yet" | "recommend"
  href: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {kind === "recommend" ? (
        <>
          <SaveForm
            action={saveNextStepResponse}
            successMessage="Next step saved. GroovGro will not execute it."
          >
            <input type="hidden" name="response" value="do_this" />
            <SaveButton pendingLabel="Saving…">I’ll do this</SaveButton>
          </SaveForm>
          <SaveForm
            action={saveNextStepResponse}
            successMessage="GroovGro recorded that nothing should change yet."
          >
            <input type="hidden" name="response" value="leave_alone" />
            <SaveButton variant="outline" pendingLabel="Saving…">
              Leave this alone
            </SaveButton>
          </SaveForm>
        </>
      ) : (
        <SaveForm
          action={saveNextStepResponse}
          successMessage="GroovGro recorded that nothing should change yet."
        >
          <input type="hidden" name="response" value="leave_alone" />
          <SaveButton pendingLabel="Saving…">Save “nothing yet”</SaveButton>
        </SaveForm>
      )}
      {href !== "/app/next-step" ? (
        <Button asChild variant="outline">
          <Link href={href}>Open the page</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function WaitingActionButtons({
  actionId,
  canApprove,
}: {
  actionId: string
  canApprove: boolean
}) {
  if (!canApprove) {
    return (
      <p className="text-xs text-muted-foreground">
        You can read this. An owner or admin can approve or reject it. GroovGro
        will not run it.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <SaveForm
        action={approveGrowthAction}
        successMessage="Action approved. GroovGro did not run it."
      >
        <input type="hidden" name="actionId" value={actionId} />
        <SaveButton pendingLabel="Saving…">Approve (do not run)</SaveButton>
      </SaveForm>
      <SaveForm
        action={rejectGrowthAction}
        successMessage="Action rejected. GroovGro did not run it."
      >
        <input type="hidden" name="actionId" value={actionId} />
        <SaveButton variant="outline" pendingLabel="Saving…">
          Reject
        </SaveButton>
      </SaveForm>
    </div>
  );
}
