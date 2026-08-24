"use client";

import Link from "next/link";

import {
  markOwnerActionDone,
  skipOwnerAction,
} from "@/lib/actions/owner-work";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";

export function OwnerWorkButtons({
  actionId,
  href,
  canUpdate,
}: {
  actionId: string
  href: string
  canUpdate: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <Link href={href}>Open the page</Link>
      </Button>
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
