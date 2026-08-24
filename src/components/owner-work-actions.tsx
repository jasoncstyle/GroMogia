"use client";

import Link from "next/link";

import {
  checkWhatChanged,
  markOwnerActionDone,
  skipOwnerAction,
} from "@/lib/actions/owner-work";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";

export function OwnerWorkButtons({
  actionId,
  href,
  canUpdate,
  showOpenPage = true,
}: {
  actionId: string
  href: string
  canUpdate: boolean
  showOpenPage?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {showOpenPage ? (
        <Button asChild>
          <Link href={href}>
            {href === "/app/next-step" ? "Open Next step" : "Open the page"}
          </Link>
        </Button>
      ) : null}
      {canUpdate ? (
        <>
          <SaveForm
            action={markOwnerActionDone}
            successMessage="Saved. GroovGro recorded that you did this."
          >
            <input type="hidden" name="actionId" value={actionId} />
            <SaveButton variant="outline" pendingLabel="Saving…">
              I did this
            </SaveButton>
          </SaveForm>
          <SaveForm
            action={skipOwnerAction}
            successMessage="Skipped. GroovGro did not run it."
          >
            <input type="hidden" name="actionId" value={actionId} />
            <SaveButton variant="ghost" pendingLabel="Saving…">
              Skip for now
            </SaveButton>
          </SaveForm>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          An owner or admin can mark this done. GroovGro will not run it.
        </p>
      )}
    </div>
  );
}

export function CheckWhatChangedButton({
  actionId,
  canCheck,
}: {
  actionId: string
  canCheck: boolean
}) {
  if (!canCheck) {
    return (
      <p className="text-xs text-muted-foreground">
        An owner or admin can check what changed. GroovGro will not run
        anything.
      </p>
    );
  }
  return (
    <SaveForm
      action={checkWhatChanged}
      successMessage="GroovGro compared the Goal number. It did not change the plan."
    >
      <input type="hidden" name="actionId" value={actionId} />
      <SaveButton variant="outline" pendingLabel="Checking…">
        Check what changed
      </SaveButton>
    </SaveForm>
  );
}
