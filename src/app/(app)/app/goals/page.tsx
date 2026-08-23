import Link from "next/link";

import {
  createGoal,
  createGrowthPlan,
  updateGoalProgress,
  updateGrowthSettings,
} from "@/lib/actions/growth";
import {
  ConfirmRejectButtons,
  InferredBadge,
  ReviewConnectedDataButton,
} from "@/components/growth-review";
import { getAppSession } from "@/lib/auth/session";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import {
  AUTONOMY_LEVELS,
  GOAL_STATUSES,
  GOAL_TYPES,
  REVIEW_FREQUENCIES,
  WEEKDAYS,
  labelFor,
} from "@/lib/growth/types";
import { formatMoney } from "@/lib/money";
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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="text-muted-foreground">
          A Goal is a measurable outcome. GroovGro should help get there, then
          wait for enough evidence before changing course. Suggested goals stay
          drafts until you confirm them.
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
          <Button asChild variant="outline" size="sm">
            <Link href="/app/decisions">Open decision history</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Growth review schedule</CardTitle>
          <CardDescription>
            This is when routine reviews are presented. It does not force
            GroovGro to change the business on that day.
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
        </CardHeader>
        <CardContent className="space-y-4">
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
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Growth plans</CardTitle>
          <CardDescription>
            Plans are versioned. A new plan does not overwrite the last one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plans yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Goal</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      {goals.find((goal) => goal.id === plan.goalId)?.title ?? "Goal"}
                    </TableCell>
                    <TableCell>v{plan.version}</TableCell>
                    <TableCell>{plan.status}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {plan.strategySummary}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
