import Link from "next/link";

import {
  createGoal,
  createGrowthPlan,
  refreshConnectedGoalProgress,
  updateGoalProgress,
  updateGrowthSettings,
} from "@/lib/actions/growth";
import {
  ConfirmRejectButtons,
  InferredBadge,
  ReviewConnectedDataButton,
} from "@/components/growth-review";
import {
  DraftGrowthPlanButton,
  GrowthPlanReviewButtons,
  ProposePlanActionsButton,
} from "@/components/growth-plan-actions";
import { WaitingActionButtons } from "@/components/next-step-actions";
import { OwnerWorkButtons } from "@/components/owner-work-actions";
import { hrefForGrowthAction } from "@/lib/growth/owner-work";
import { getAppSession } from "@/lib/auth/session";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { hasPermission } from "@/lib/permissions";
import {
  AUTONOMY_LEVELS,
  GOAL_STATUSES,
  GOAL_TYPES,
  REVIEW_FREQUENCIES,
  WEEKDAYS,
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
  const canDraftPlan = hasPermission(session.permissions, "modify_goals");
  const canApprovePlan = hasPermission(session.permissions, "approve_plans");
  const canApproveAction = hasPermission(session.permissions, "approve_actions");
  const canUpdateWork = hasPermission(session.permissions, "modify_goals");
  const actions = snapshot?.actions ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="text-muted-foreground">
          A Goal is a measurable outcome. GroovGro can draft a plan for a
          confirmed Goal. Approving that plan does not run marketing.
          Suggested goals stay drafts until you confirm them.
        </p>
        <div className="mt-3">
          <ReviewConnectedDataButton disabled={!session.organizationId} />
        </div>
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
              <Link href="/app">Read the path so far</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/next-step">Open next step</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/growth-review">Open growth review</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/decisions">Open decision history</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/intelligence">Open specialists</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Growth review schedule</CardTitle>
          <CardDescription>
            This is when routine reviews are presented. It does not force
            GroovGro to change the business on that day. Open Growth review
            to read the current weekly and monthly summary.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SaveForm
            action={updateGrowthSettings}
            successMessage="Review schedule saved"
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="reviewFrequency">How often</Label>
              <select
                id="reviewFrequency"
                name="reviewFrequency"
                className={selectClassName}
                defaultValue={settings?.reviewFrequency ?? "weekly"}
              >
                {REVIEW_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {labelFor(frequency)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewDay">Day</Label>
              <select
                id="reviewDay"
                name="reviewDay"
                className={selectClassName}
                defaultValue={settings?.reviewDay ?? "monday"}
              >
                {WEEKDAYS.map((day) => (
                  <option key={day} value={day}>
                    {labelFor(day)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewTime">Time</Label>
              <Input
                id="reviewTime"
                name="reviewTime"
                type="time"
                defaultValue={settings?.reviewTime ?? "10:00"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                name="timezone"
                defaultValue={settings?.timezone ?? "America/New_York"}
              />
            </div>
            <SaveButton type="submit" disabled={!session.organizationId}>
              Save schedule
            </SaveButton>
          </SaveForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a goal</CardTitle>
        </CardHeader>
        <CardContent>
          <SaveForm
            action={createGoal}
            successMessage="Goal saved"
            resetOnSuccess
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">What are we trying to accomplish?</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goalType">Type</Label>
              <select id="goalType" name="goalType" className={selectClassName} defaultValue="custom">
                {GOAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {labelFor(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select id="priority" name="priority" className={selectClassName} defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetMetric">Metric</Label>
              <Input id="targetMetric" name="targetMetric" placeholder="leads, sales, revenue" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" placeholder="leads, customers, dollars" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baselineValue">Starting number</Label>
              <Input id="baselineValue" name="baselineValue" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetValue">Target number</Label>
              <Input id="targetValue" name="targetValue" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentValue">Current number</Label>
              <Input id="currentValue" name="currentValue" type="number" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offerId">Related offer</Label>
              <select id="offerId" name="offerId" className={selectClassName} defaultValue="">
                <option value="">None</option>
                {offers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startsOn">Start</Label>
              <Input id="startsOn" name="startsOn" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" name="deadline" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedRevenue">Expected value</Label>
              <Input id="expectedRevenue" name="expectedRevenue" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalBudget">Budget</Label>
              <Input id="totalBudget" name="totalBudget" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerSegment">Customer segment</Label>
              <Input id="customerSegment" name="customerSegment" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="successDefinition">What success looks like</Label>
              <Textarea id="successDefinition" name="successDefinition" rows={3} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Notes</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <SaveButton type="submit" disabled={!session.organizationId}>
              Save goal
            </SaveButton>
          </SaveForm>
        </CardContent>
      </Card>

      {(snapshot?.inferredGoals.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Suggested goals waiting for you</CardTitle>
            <CardDescription>
              GroovGro drafted these from connected data. Confirming makes a
              Goal active. Rejecting leaves it unused. Nothing else happens.
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
                <div className="mt-3">
                  <ConfirmRejectButtons id={goal.id} kind="goal" />
                </div>
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
            <SaveForm
              action={refreshConnectedGoalProgress}
              successMessage="Progress saved"
            >
              <SaveButton type="submit" disabled={!session.organizationId}>
                Save progress from connected data
              </SaveButton>
            </SaveForm>
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
                {canDraftPlan ? (
                  <div className="mt-3">
                    <DraftGrowthPlanButton goalId={goal.id} />
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
            current Next step. After you approve a plan, GroovGro can propose
            the first actions. Approving a plan or an action does not run
            marketing.
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
              No plans yet. Open a Goal above and click Draft a plan for this
              Goal.
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
                    <GrowthPlanReviewButtons
                      planId={plan.id}
                      canApprove={canApprovePlan}
                    />
                  ) : null}
                  {plan.status === "approved" || plan.status === "active" ? (
                    <div className="space-y-3">
                      {canDraftPlan ? (
                        <ProposePlanActionsButton planId={plan.id} />
                      ) : null}
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
                              <WaitingActionButtons
                                actionId={action.id}
                                canApprove={canApproveAction}
                              />
                            ) : null}
                            {action.status === "approved" ? (
                              <OwnerWorkButtons
                                actionId={action.id}
                                href={hrefForGrowthAction(action)}
                                canUpdate={canUpdateWork}
                              />
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
