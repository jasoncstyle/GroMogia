import Link from "next/link";

import { proposeGrowthAction, recordDecision } from "@/lib/actions/growth";
import { getAppSession } from "@/lib/auth/session";
import { OpenNextStepLink } from "@/components/open-next-step-link";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { DECISION_TYPES, labelFor } from "@/lib/growth/types";
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

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export default async function DecisionsPage() {
  const session = await getAppSession();
  const snapshot = session.organizationId
    ? await getGrowthSnapshot(session.organizationId)
    : null;
  const goals = snapshot?.goals ?? [];
  const decisions = snapshot?.decisions ?? [];
  const actions = snapshot?.actions ?? [];
  const policies = snapshot?.policies ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Decisions</h1>
        <p className="text-muted-foreground">
          Decision History records why a change was recommended or left alone.
          The audit log records what changed. &quot;No change yet&quot; is a
          valid and useful decision. Save this week’s look from Next step.
          Recent decisions also appear on Next step. Read the path so far on
          Next step. Approve or reject proposed actions on Next step. The
          monthly write-up is on Growth review.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/app/next-step">Open Next step</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/growth-review">Open growth review</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evidence windows</CardTitle>
          <CardDescription>
            GroovGro does not treat new data as a reason to act. Each channel
            has a waiting period. This is a simple threshold, not a statistics
            engine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {policies.length === 0 ? (
            <p className="text-muted-foreground">
              Default evidence policies will appear after you sign in with the
              database connected.
            </p>
          ) : (
            policies.map((policy) => (
              <p key={policy.id}>
                <span className="font-medium">{labelFor(policy.channel)}: </span>
                {policy.minElapsedDays} days, {policy.minObservations}{" "}
                observations, {policy.minConversions} conversions. {policy.notes}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record a decision</CardTitle>
          <CardDescription>
            Use this to keep a human or later AI recommendation. GroovGro will
            not execute anything from this form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SaveForm
            action={recordDecision}
            successMessage="Decision saved"
            resetOnSuccess
            className="grid gap-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="goalId">Related goal</Label>
                <select id="goalId" name="goalId" className={selectClassName} defaultValue="">
                  <option value="">None</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="decisionType">Decision type</Label>
                <select
                  id="decisionType"
                  name="decisionType"
                  className={selectClassName}
                  defaultValue="no_change"
                >
                  {DECISION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type === "no_change" ? "No change yet" : labelFor(type)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recommendation">Recommendation</Label>
              <Textarea id="recommendation" name="recommendation" rows={3} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rationale">Why</Label>
              <Textarea id="rationale" name="rationale" rows={3} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supportingEvidence">Evidence</Label>
                <Input id="supportingEvidence" name="supportingEvidence" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidenceWindow">Evidence window</Label>
                <Input
                  id="evidenceWindow"
                  name="evidenceWindow"
                  placeholder="e.g. last 14 days"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence (0-100)</Label>
              <Input id="confidence" name="confidence" type="number" min="0" max="100" />
            </div>
            <SaveButton type="submit" disabled={!session.organizationId}>
              Save decision
            </SaveButton>
          </SaveForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Propose an action</CardTitle>
          <CardDescription>
            Actions are stored so later automation can use them. They stay
            proposed. No execution, no advertising changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SaveForm
            action={proposeGrowthAction}
            successMessage="Proposed action saved. GroovGro will not execute it."
            resetOnSuccess
            className="grid gap-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="actionGoalId">Related goal</Label>
                <select id="actionGoalId" name="goalId" className={selectClassName} defaultValue="">
                  <option value="">None</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk">Risk</Label>
                <select id="risk" name="risk" className={selectClassName} defaultValue="optimization">
                  <option value="operational">Operational</option>
                  <option value="optimization">Optimization</option>
                  <option value="strategic">Strategic</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="module">Module</Label>
              <Input id="module" name="module" placeholder="seo, email, website, advertising" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Proposed action</Label>
              <Textarea id="description" name="description" rows={3} required />
            </div>
            <SaveButton type="submit" disabled={!session.organizationId}>
              Save proposed action
            </SaveButton>
          </SaveForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decision history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No decisions yet. Recording &quot;leave this unchanged&quot; is a
              successful use of this page.
            </p>
          ) : (
            decisions.map((decision) => (
              <div key={decision.id} className="rounded-lg border p-4 text-sm">
                <p className="font-medium">
                  {decision.decisionType === "no_change"
                    ? "No change yet"
                    : labelFor(decision.decisionType)}
                </p>
                <p>{decision.recommendation}</p>
                {decision.rationale ? (
                  <p className="text-muted-foreground">{decision.rationale}</p>
                ) : null}
                {decision.outcome ? (
                  <p className="text-muted-foreground">{decision.outcome}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {decision.createdAt.toLocaleString()}
                  {decision.evidenceWindow ? ` · ${decision.evidenceWindow}` : ""}
                  {decision.confidence
                    ? ` · confidence ${decision.confidence}`
                    : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proposed actions</CardTitle>
          <CardDescription>
            Approve or reject these on Next step. Approving does not run them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">None proposed yet.</p>
          ) : (
            actions.map((action) => (
              <div key={action.id} className="space-y-2 rounded-lg border p-4 text-sm">
                <p className="font-medium">{action.description}</p>
                <p className="text-muted-foreground">
                  {action.status} · {labelFor(action.risk)}
                  {action.module ? ` · ${action.module}` : ""}
                </p>
              </div>
            ))
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/app/audit">Open audit log</Link>
          </Button>
        </CardContent>
      </Card>

      <OpenNextStepLink />
    </div>
  );
}
