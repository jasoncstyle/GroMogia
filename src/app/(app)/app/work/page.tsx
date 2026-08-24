import Link from "next/link";

import {
  CheckWhatChangedButton,
  OwnerWorkButtons,
} from "@/components/owner-work-actions";
import { WaitingActionButtons } from "@/components/next-step-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import {
  OWNER_DONE_STATUS,
  hrefForGrowthAction,
  partitionOwnerWork,
} from "@/lib/growth/owner-work";
import { workLearningFromResult } from "@/lib/growth/work-learning";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { labelFor } from "@/lib/growth/types";
import { hasPermission } from "@/lib/permissions";

export default async function OwnerWorkPage() {
  const session = await getAppSession();
  const snapshot = session.organizationId
    ? await getGrowthSnapshot(session.organizationId)
    : null;
  const work = partitionOwnerWork(snapshot?.actions ?? []);
  const canUpdate = hasPermission(session.permissions, "modify_goals");
  const canApprove = hasPermission(session.permissions, "approve_actions");
  const canCheck = hasPermission(session.permissions, "view_decision_history");
  const approvedPlan = snapshot?.plans.find(
    (plan) => plan.status === "approved" || plan.status === "active",
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your work</h1>
        <p className="text-muted-foreground">
          These are actions you approved. You do them. GroovGro does not run
          marketing, send email, change ads, or edit the live website.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ready for you</CardTitle>
          <CardDescription>
            Open the page, do the work, then click I did this. GroovGro only
            records that you did it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {work.open.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing is ready yet. Approve a proposed action on Goals, or
              propose the first actions from an approved plan.
            </p>
          ) : (
            work.open.map((action) => (
              <div key={action.id} className="space-y-3 rounded-lg border p-4">
                <p className="font-medium">{action.description}</p>
                <p className="text-sm text-muted-foreground">
                  {labelFor(action.risk)}
                  {action.module ? ` · ${labelFor(action.module)}` : ""}
                </p>
                <OwnerWorkButtons
                  actionId={action.id}
                  href={hrefForGrowthAction(action)}
                  canUpdate={canUpdate}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {work.waiting.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Still waiting for your say</CardTitle>
            <CardDescription>
              Approve these first. Approving does not run them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {work.waiting.map((action) => (
              <div key={action.id} className="space-y-2 rounded-lg border p-4 text-sm">
                <p className="font-medium">{action.description}</p>
                <p className="text-muted-foreground">
                  {action.status} · {labelFor(action.risk)}
                </p>
                <WaitingActionButtons
                  actionId={action.id}
                  canApprove={canApprove}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {work.finished.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Already handled</CardTitle>
            <CardDescription>
              You marked these. GroovGro did not execute them. Check what
              changed compares the Goal number from when you finished to now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {work.finished.slice(0, 8).map((action) => {
              const learned = workLearningFromResult(action.result ?? "");
              return (
              <div key={action.id} className="space-y-2 rounded-lg border p-4 text-sm">
                <p className="font-medium">{action.description}</p>
                <p className="text-muted-foreground">{labelFor(action.status)}</p>
                {learned ? (
                  <p className="text-muted-foreground">{learned}</p>
                ) : null}
                {action.status === OWNER_DONE_STATUS ? (
                  <CheckWhatChangedButton
                    actionId={action.id}
                    canCheck={canCheck}
                  />
                ) : null}
              </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {approvedPlan ? (
          <Button asChild>
            <Link href="/app/goals">Open the approved plan</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/app/goals">Draft or approve a plan</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/app/next-step">Next step</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/decisions">Decisions</Link>
        </Button>
      </div>
    </div>
  );
}
