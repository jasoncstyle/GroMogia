import Link from "next/link";

import {
  createGrowthPlan,
  updateGoalProgress,
} from "@/lib/actions/growth";
import { InferredBadge } from "@/components/growth-review";
import { DraftGrowthPlanButton } from "@/components/growth-plan-actions";
import { ActivateGoalButton, DraftNextGoalButton } from "@/components/next-goal-actions";
import { GoalCreateForm } from "@/components/goal-create-form";
import { SaveConnectedProgressButton } from "@/components/save-connected-progress-button";
import {
  alreadyDraftedNextGoal,
  canActivateDraftGoal,
  canDraftNextGoal,
} from "@/lib/growth/next-goal";
import { getAppSession } from "@/lib/auth/session";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { hasPermission } from "@/lib/permissions";
import {
  AUTONOMY_LEVELS,
  GOAL_STATUSES,
  labelFor,
} from "@/lib/growth/types";
import { formatMoney } from "@/lib/money";
import { FoldableSample } from "@/components/foldable-sample";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export default async function GoalsPage() {
  const session = await getAppSession();
  const snapshot = session.organizationId
    ? await getGrowthSnapshot(session.organizationId)
    : null;
  const goals = (snapshot?.goals ?? []).filter(
    (goal) => goal.discoveryStatus !== "inferred",
  );
  const offers = snapshot?.offers ?? [];
  const plans = snapshot?.plans ?? [];
  const settings = snapshot?.settings;
  const autonomy = AUTONOMY_LEVELS.find(
    (item) => item.level === (settings?.autonomyLevel ?? 2),
  );
  const canCreateGoal = hasPermission(session.permissions, "create_goals");
  const canDraftPlan = hasPermission(session.permissions, "modify_goals");
  const actions = snapshot?.actions ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="text-muted-foreground">
          A Goal is a measurable outcome. A draft stays a draft until you
          click Make this the active Goal. GroovGro can then draft a plan.
          Approve or reject that plan on Next step. Approving does not run
          marketing. Approve or reject proposed actions on Next step. Do
          approved work on Next step or Your work. Confirm or reject
          suggested goals on Next step. They stay drafts until you do.
          Review connected data on Next step when GroovGro asks, or on
          Business if you want to run it again.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How GroovGro is allowed to work</CardTitle>
          <CardDescription>
            Autonomy stays at Recommend for now. GroovGro will not run ads,
            change budgets, or take actions by itself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Current level: </span>
            {autonomy ? `${autonomy.level} — ${autonomy.name}` : "Recommend"}
          </p>
          <p className="text-muted-foreground">
            {autonomy?.description ?? "Recommend and explain."} Guarded
            autopilot is feature-flagged off.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/app/next-step">Open Next step</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/growth-review">Open growth review</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Growth review schedule</CardTitle>
          <CardDescription>
            This is when routine reviews are presented. It does not force
            GroovGro to change the business on that day. Choose when you look
            at this week’s numbers on Next step. Open Growth review to change
            that day later. Open Next step to read this week’s look.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The schedule form is on Next step when GroovGro asks, and on
            Growth review if you want to change it later.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a goal</CardTitle>
        </CardHeader>
        <CardContent>
          <GoalCreateForm
            offers={offers}
            disabled={!canCreateGoal}
          />
        </CardContent>
      </Card>

      {(snapshot?.inferredGoals.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Suggested goals waiting for you</CardTitle>
            <CardDescription>
              GroovGro drafted these from connected data. Confirm or reject
              them on Next step. Confirming makes a Goal active. Rejecting
              leaves it unused. Nothing else happens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot?.inferredGoals.map((goal) => (
              <div key={goal.id} className="rounded-lg border p-4">
                <p className="font-medium">{goal.title}</p>
                <p className="text-sm text-muted-foreground">{goal.description}</p>
                <p className="text-sm">
                  {goal.liveCurrentValue}
                  {goal.targetValue != null ? ` / ${goal.targetValue}` : ""}
                  {goal.unit ? ` ${goal.unit}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">{goal.liveNote}</p>
                <InferredBadge source={goal.inferredFrom} confidence={goal.confidence} />
                <p className="mt-3 text-xs text-muted-foreground">
                  Confirm or reject this on Next step. Confirming makes it
                  active. GroovGro will not start marketing.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Active and recent goals</CardTitle>
          <CardDescription>
            Connected goals can save today&apos;s number from leads, bookings,
            and payments. That stores a history. It does not start marketing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.some((goal) => goal.liveComputable) ? (
            <SaveConnectedProgressButton disabled={!session.organizationId} />
          ) : null}
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No goals yet. Add the first measurable outcome above.
            </p>
          ) : (
            goals.map((goal) => (
              <div key={goal.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{goal.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {labelFor(goal.goalType)} · {goal.status}
                      {goal.progressPercent != null
                        ? ` · ${goal.progressPercent}% of target`
                        : ""}
                    </p>
                    <p className="text-sm">
                      {goal.liveComputable ? goal.liveCurrentValue : goal.currentValue}
                      {goal.targetValue != null ? ` / ${goal.targetValue}` : ""}
                      {goal.unit ? ` ${goal.unit}` : ""}
                      {goal.deadline
                        ? ` · due ${goal.deadline.toLocaleDateString()}`
                        : ""}
                    </p>
                    {goal.liveNote ? (
                      <p className="text-sm text-muted-foreground">{goal.liveNote}</p>
                    ) : null}
                    {goal.progressRecordedAt ? (
                      <p className="text-sm text-muted-foreground">
                        Last saved: {goal.currentValue}
                        {goal.unit ? ` ${goal.unit}` : ""} on{" "}
                        {goal.progressRecordedAt.toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No saved history yet. Save progress to keep today&apos;s
                        number.
                      </p>
                    )}
                  </div>
                  {goal.totalBudgetCents != null ? (
                    <p className="text-sm text-muted-foreground">
                      Budget {formatMoney(goal.totalBudgetCents)}
                    </p>
                  ) : null}
                </div>
                <SaveForm
                  action={updateGoalProgress}
                  successMessage="Goal updated"
                  className="mt-3 flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="goalId" value={goal.id} />
                  <div className="space-y-1">
                    <Label htmlFor={`current-${goal.id}`}>Current</Label>
                    <Input
                      id={`current-${goal.id}`}
                      name="currentValue"
                      type="number"
                      className="w-28"
                      defaultValue={goal.currentValue}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`status-${goal.id}`}>Status</Label>
                    <select
                      id={`status-${goal.id}`}
                      name="status"
                      className={selectClassName}
                      defaultValue={goal.status}
                    >
                      {GOAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {labelFor(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <SaveButton type="submit" variant="outline" size="sm">
                    Update
                  </SaveButton>
                </SaveForm>
                {canDraftPlan && canActivateDraftGoal(goal) ? (
                  <div className="mt-3">
                    <ActivateGoalButton goalId={goal.id} />
                  </div>
                ) : null}
                {canDraftPlan ? (
                  <div className="mt-3">
                    <DraftGrowthPlanButton goalId={goal.id} />
                  </div>
                ) : null}
                {canCreateGoal &&
                canDraftNextGoal({
                  status: goal.status,
                  currentValue: goal.liveCurrentValue,
                  targetValue: goal.targetValue,
                }) &&
                !alreadyDraftedNextGoal(snapshot?.goals ?? [], goal.id) ? (
                  <div className="mt-3">
                    <DraftNextGoalButton goalId={goal.id} />
                  </div>
                ) : null}
                {goal.progressHistory.length > 0 ? (
                  <div className="mt-3">
                    <FoldableSample
                      title="Saved progress"
                      subtitle={`${goal.progressHistory.length} stored number${goal.progressHistory.length === 1 ? "" : "s"}. Open to read the history.`}
                    >
                      {goal.progressHistory.map((row) => (
                        <p key={row.id} className="text-sm text-muted-foreground">
                          {row.recordedAt.toLocaleDateString()}: {row.value}
                          {goal.unit ? ` ${goal.unit}` : ""}
                          {row.source === "manual"
                            ? " · saved by hand"
                            : " · from connected data"}
                          {row.note ? ` · ${row.note}` : ""}
                        </p>
                      ))}
                    </FoldableSample>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Growth plans</CardTitle>
          <CardDescription>
            GroovGro can draft a plan from a Goal, confirmed offers, and the
            current Next step. Approve or reject a draft plan on Next step.
            Propose the first actions on Next step. Approving a plan or an
            action does not run marketing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FoldableSample
            title="Write a plan yourself"
            subtitle="Optional. Most owners use Draft a plan for this Goal on a Goal above."
          >
          <SaveForm
            action={createGrowthPlan}
            successMessage="Plan saved"
            resetOnSuccess
            className="grid gap-4"
          >
            <div className="space-y-2">
              <Label htmlFor="planGoalId">Goal</Label>
              <select
                id="planGoalId"
                name="goalId"
                className={selectClassName}
                required
                defaultValue={goals[0]?.id ?? ""}
              >
                {goals.length === 0 ? (
                  <option value="">Add a goal first</option>
                ) : (
                  goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategySummary">Strategy summary</Label>
              <Textarea id="strategySummary" name="strategySummary" rows={4} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget">Plan budget</Label>
                <Input id="budget" name="budget" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planStatus">Status</Label>
                <select id="planStatus" name="status" className={selectClassName} defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="superseded">Superseded</option>
                </select>
              </div>
            </div>
            <SaveButton type="submit" disabled={!session.organizationId || goals.length === 0}>
              Save plan version
            </SaveButton>
          </SaveForm>
          </FoldableSample>

          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No plans yet. Open Next step when it asks you to draft a plan,
              or open a Goal above and click Draft a plan for this Goal.
            </p>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.id} className="space-y-3 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">
                      {goals.find((goal) => goal.id === plan.goalId)?.title ?? "Goal"}{" "}
                      · v{plan.version} · {plan.status}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {plan.strategySummary}
                    </p>
                  </div>
                  {plan.status === "draft" ? (
                    <p className="text-xs text-muted-foreground">
                      Approve or reject this plan on Next step. Approving does
                      not run marketing.
                    </p>
                  ) : null}
                  {plan.status === "approved" || plan.status === "active" ? (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Propose the first actions on Next step. GroovGro will
                        not run them.
                      </p>
                      {actions
                        .filter((action) => action.planId === plan.id)
                        .map((action) => (
                          <div
                            key={action.id}
                            className="space-y-2 rounded-md border p-3 text-sm"
                          >
                            <p className="font-medium">{action.description}</p>
                            <p className="text-muted-foreground">
                              {action.status} · {labelFor(action.risk)}
                            </p>
                            {action.status === "proposed" ||
                            action.status === "awaiting_approval" ? (
                              <p className="text-xs text-muted-foreground">
                                Approve or reject this on Next step. Approving
                                does not run it.
                              </p>
                            ) : null}
                            {action.status === "approved" ? (
                              <p className="text-xs text-muted-foreground">
                                Do this on Next step or Your work. GroovGro
                                will not run it.
                              </p>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
