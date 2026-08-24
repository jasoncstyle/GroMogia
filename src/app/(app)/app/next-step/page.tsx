import Link from "next/link";

import { ConfirmRejectButtons, InferredBadge } from "@/components/growth-review";
import { DraftGrowthPlanButton, GrowthPlanReviewButtons, ProposePlanActionsButton } from "@/components/growth-plan-actions";
import { ActivateGoalButton, DraftNextGoalButton } from "@/components/next-goal-actions";
import { NextStepResponseButtons, WaitingActionButtons } from "@/components/next-step-actions";
import { OwnerWorkButtons, CheckWhatChangedButton } from "@/components/owner-work-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import { getCoordinatedNextStep } from "@/lib/growth/queries";
import { hrefForGrowthAction } from "@/lib/growth/owner-work";
import { APPROVE_ACTIONS_STEP_TITLE, APPROVE_PLAN_STEP_TITLE, CHECK_CHANGED_STEP_TITLE, CONFIRM_DRAFTS_STEP_TITLE, DRAFT_PLAN_STEP_TITLE, OWNER_WORK_STEP_TITLE, PROPOSE_ACTIONS_STEP_TITLE } from "@/lib/growth/plan-draft";
import { labelFor } from "@/lib/growth/types";
import { hasPermission } from "@/lib/permissions";

export default async function NextStepPage() {
  const session = await getAppSession();
  const step = session.organizationId
    ? await getCoordinatedNextStep(session.organizationId)
    : null;
  const canDecide = hasPermission(session.permissions, "view_decision_history");
  const canCheck = canDecide;
  const canApprove = hasPermission(session.permissions, "approve_actions");
  const canCreateGoal = hasPermission(session.permissions, "create_goals");
  const canActivateGoal = hasPermission(session.permissions, "modify_goals");
  const canDraftPlan = hasPermission(session.permissions, "modify_goals");
  const canUpdateWork = canDraftPlan;
  const canApprovePlan = hasPermission(session.permissions, "approve_plans");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Next step</h1>
        <p className="text-muted-foreground">
          GroovGro reads your Goals, specialists, and connected data, then
          names one thing to do — or says to wait. You decide. GroovGro does
          not run marketing, send email, change ads, or edit the live website.
        </p>
      </div>

      {!step ? (
        <p className="text-sm text-muted-foreground">
          Sign in to see the next step for this business.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{step.primary.title}</CardTitle>
              <CardDescription>
                {step.primary.kind === "no_change_yet"
                  ? "No change is the recommendation."
                  : `${labelFor(step.primary.classification)} · from ${step.primary.source === "drafts" ? "Business drafts" : step.primary.source === "specialist" ? "a specialist" : step.primary.source === "owner_work" ? "Your work" : step.primary.source === "learning" ? "what changed" : step.primary.source === "goals" ? "Goals" : "the growth review"}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{step.primary.body}</p>
              {step.primary.title === CONFIRM_DRAFTS_STEP_TITLE ? (
                step.inferredDrafts.map((draft) => (
                  <div key={draft.id} className="space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{draft.title}</p>
                    {draft.description ? (
                      <p className="text-muted-foreground">
                        {draft.description.length > 280
                          ? `${draft.description.slice(0, 279).trimEnd()}…`
                          : draft.description}
                      </p>
                    ) : null}
                    <InferredBadge
                      source={draft.inferredFrom}
                      confidence={draft.confidence}
                    />
                    <ConfirmRejectButtons id={draft.id} kind={draft.kind} />
                  </div>
                ))
              ) : step.primary.title === APPROVE_ACTIONS_STEP_TITLE ? (
                step.waitingActions.map((action) => (
                  <div key={action.id} className="space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{action.description}</p>
                    <p className="text-muted-foreground">
                      {action.status} · {labelFor(action.risk)}
                      {action.module ? ` · ${action.module}` : ""}
                    </p>
                    <WaitingActionButtons
                      actionId={action.id}
                      canApprove={canApprove}
                    />
                  </div>
                ))
              ) : step.primary.title === OWNER_WORK_STEP_TITLE ? (
                step.openWork.map((action) => (
                  <div key={action.id} className="space-y-3 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{action.description}</p>
                    <p className="text-muted-foreground">
                      {labelFor(action.risk)}
                      {action.module ? ` · ${labelFor(action.module)}` : ""}
                    </p>
                    <OwnerWorkButtons
                      actionId={action.id}
                      href={hrefForGrowthAction(action)}
                      canUpdate={canUpdateWork}
                    />
                  </div>
                ))
              ) : step.primary.title === CHECK_CHANGED_STEP_TITLE ? (
                step.uncheckedWork.map((action) => (
                  <div key={action.id} className="space-y-3 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{action.description}</p>
                    <CheckWhatChangedButton
                      actionId={action.id}
                      canCheck={canCheck}
                    />
                  </div>
                ))
              ) : canDecide ? (
                <NextStepResponseButtons
                  kind={step.primary.kind}
                  href={step.primary.href}
                />
              ) : (
                <Button asChild variant="outline">
                  <Link href={step.primary.href}>Open the page</Link>
                </Button>
              )}
              {canCreateGoal &&
              step.primary.title === "This Goal is reached" &&
              step.primary.goalId ? (
                <DraftNextGoalButton goalId={step.primary.goalId} />
              ) : null}
              {canActivateGoal &&
              step.primary.title === "Make this the active Goal" &&
              step.primary.goalId ? (
                <ActivateGoalButton goalId={step.primary.goalId} />
              ) : null}
              {canDraftPlan &&
              step.primary.title === DRAFT_PLAN_STEP_TITLE &&
              step.primary.goalId ? (
                <DraftGrowthPlanButton goalId={step.primary.goalId} />
              ) : null}
              {step.primary.title === APPROVE_PLAN_STEP_TITLE &&
              step.primary.planId ? (
                <GrowthPlanReviewButtons
                  planId={step.primary.planId}
                  canApprove={canApprovePlan}
                />
              ) : null}
              {canDraftPlan &&
              step.primary.title === PROPOSE_ACTIONS_STEP_TITLE &&
              step.primary.planId ? (
                <ProposePlanActionsButton planId={step.primary.planId} />
              ) : null}
            </CardContent>
          </Card>

          {step.waitingActions.length > 0 &&
          step.primary.title !== APPROVE_ACTIONS_STEP_TITLE ? (
            <Card>
              <CardHeader>
                <CardTitle>Waiting for your say</CardTitle>
                <CardDescription>
                  These are saved proposals. Approving them does not run them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {step.waitingActions.map((action) => (
                  <div key={action.id} className="space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{action.description}</p>
                    <p className="text-muted-foreground">
                      {action.status} · {labelFor(action.risk)}
                      {action.module ? ` · ${action.module}` : ""}
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

          <Card>
            <CardHeader>
              <CardTitle>What GroovGro is leaving alone</CardTitle>
              <CardDescription>
                Ads, email, and social stay off. Thin evidence stays as wait.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {step.leftAlone.length === 0 ? (
                <p className="text-muted-foreground">
                  Nothing extra is being left alone this period.
                </p>
              ) : (
                step.leftAlone.map((item) => (
                  <div key={`${item.specialistId ?? item.title}`}>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground">{item.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Write it as a plan</CardTitle>
              <CardDescription>
                Next step is one thing to do now. If GroovGro asks you to
                confirm drafts, draft a plan, approve it, propose the first
                actions, approve those actions, do work you already approved,
                or check what changed, use the buttons above. A Growth Plan is
                a versioned write-up for a Goal. After you approve a plan,
                GroovGro can propose the first actions. Nothing runs until you
                say so, and even then GroovGro does not execute.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/app/goals">Open Goals</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/work">Open Your work</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/app">The path so far</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/goals">Goals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/growth-review">Growth review</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/intelligence">Specialists</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/decisions">Decisions</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
