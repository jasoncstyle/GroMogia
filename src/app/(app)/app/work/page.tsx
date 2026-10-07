import Link from "next/link";

import { ExecutionPanel } from "@/components/execution-panel";
import { GrowthActionSummary } from "@/components/growth-action-summary";
import {
  CheckWhatChangedButton,
  OwnerWorkButtons,
} from "@/components/owner-work-actions";
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
import { getExecutionRequests } from "@/lib/execute/queries";
import { actionsToQueue } from "@/lib/execute/requests";
import { labelFor } from "@/lib/growth/types";
import { hasPermission } from "@/lib/permissions";
import { parseWorkTab } from "@/lib/owner-surface/boards";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "working", label: "Working", href: "/app/work?tab=working" },
  { id: "needs-you", label: "Needs you", href: "/app/work?tab=needs-you" },
  { id: "finished", label: "Finished", href: "/app/work?tab=finished" },
] as const;

export default async function OwnerWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams;
  const tab = parseWorkTab(params.tab);
  const session = await getAppSession();
  const snapshot = session.organizationId
    ? await getGrowthSnapshot(session.organizationId)
    : null;
  const executionRequests = session.organizationId
    ? await getExecutionRequests(session.organizationId)
    : [];
  const work = partitionOwnerWork(snapshot?.actions ?? []);
  const canUpdate = hasPermission(session.permissions, "modify_goals");
  const canCheck = hasPermission(session.permissions, "view_decision_history");
  const canApprove = hasPermission(session.permissions, "approve_actions");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Work</h1>
        <p className="text-muted-foreground">
          These are actions you approved. You do them here or on Next step.
          Remaining later-run work is listed first. GroovGro does not run marketing, send email, change ads, or edit
          the live website.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-xl border px-2 text-sm font-medium",
              tab === item.id
                ? "border-foreground bg-foreground text-background"
                : "bg-card text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "working" ? (
        <Card>
          <CardHeader>
            <CardTitle>GroovGro is working on it</CardTitle>
            <CardDescription>
              Prepared work stays here. GroovGro has not run it outside this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ExecutionPanel
              requests={executionRequests}
              actions={actionsToQueue(work.open)}
              canManage={canApprove}
            />
            {executionRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                GroovGro is not running anything outside this workspace. When it is preparing a look or a draft, it will show here.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "needs-you" ? (
        <>
      <Card>
        <CardHeader>
          <CardTitle>Ready for you</CardTitle>
          <CardDescription>
            Open Next step, do the work, then click I did this. GroovGro only
            records that you did it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {work.open.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing is ready yet. Open Next step to approve a proposed action
              or propose the first actions from an approved plan.
            </p>
          ) : (
            work.open.map((action) => (
              <div key={action.id} className="space-y-3 rounded-lg border p-4">
                <GrowthActionSummary
                  title={action.title}
                  description={action.description}
                  evidence={action.evidence}
                  confidence={action.confidence}
                  expectedImpact={action.expectedImpact}
                />
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
              Approve or reject these on Next step. Approving does not run them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {work.waiting.map((action) => (
              <div key={action.id} className="space-y-2 rounded-lg border p-4 text-sm">
                <GrowthActionSummary
                  title={action.title}
                  description={action.description}
                  evidence={action.evidence}
                  confidence={action.confidence}
                  expectedImpact={action.expectedImpact}
                />
                <p className="text-muted-foreground">
                  {action.status} · {labelFor(action.risk)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
        </>
      ) : null}

      {tab === "finished" ? (
      <Card>
        <CardHeader>
          <CardTitle>Already handled</CardTitle>
          <CardDescription>
            You marked these. GroovGro did not execute them. Check what
            changed compares the Goal number from when you finished to now.
            You can also do that on Next step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {work.finished.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing is marked finished yet.
            </p>
          ) : (
          work.finished.slice(0, 8).map((action) => {
              const learned = workLearningFromResult(action.result ?? "");
              return (
              <div key={action.id} className="space-y-2 rounded-lg border p-4 text-sm">
                <GrowthActionSummary
                  title={action.title}
                  description={action.description}
                  evidence={action.evidence}
                  confidence={action.confidence}
                  expectedImpact={action.expectedImpact}
                />
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
            })
          )}
        </CardContent>
      </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/app/next-step">Open Next step</Link>
        </Button>
      </div>
    </div>
  );
}
