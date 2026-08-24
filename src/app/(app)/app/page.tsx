import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import { appUrl, missingFoundationServices } from "@/lib/env";
import { GrowthStoryCard } from "@/components/growth-story";
import { partitionOwnerWork } from "@/lib/growth/owner-work";
import { getCoordinatedNextStep, getGrowthSnapshot } from "@/lib/growth/queries";
import { buildGrowthStory, storyFactsFromWorkspace } from "@/lib/growth/story";
import {
  buildStatusAlerts,
  websiteWasRead,
} from "@/lib/growth/status-alerts";
import { formatMoney } from "@/lib/money";
import { resolveOrganizationSlug } from "@/lib/org";
import { isModuleEnabled } from "@/lib/modules/catalog";
import { getDashboardSnapshot } from "@/lib/phase2/queries";
import { ReviewConnectedDataButton } from "@/components/growth-review";
import { StatusAlertList } from "@/components/status-alert";

export default async function DashboardPage() {
  const session = await getAppSession();
  const missing = missingFoundationServices();
  const slug = await resolveOrganizationSlug(
    session.organizationId,
    session.organizationSlug,
  );
  const leadFormUrl = slug ? `${appUrl()}/l/${slug}` : "";
  const [snapshot, growth, nextStep] = session.organizationId
    ? await Promise.all([
        getDashboardSnapshot(session.organizationId),
        getGrowthSnapshot(session.organizationId),
        getCoordinatedNextStep(session.organizationId),
      ])
    : [null, null, null];

  const happening = snapshot
    ? `${snapshot.openLeadCount} open lead${snapshot.openLeadCount === 1 ? "" : "s"}, ${snapshot.customerCount} customer${snapshot.customerCount === 1 ? "" : "s"}, and ${formatMoney(snapshot.paymentTotalCents)} in payments this month.`
    : "Sign in to see live counts for this organization.";

  const why = snapshot
    ? snapshot.topChannels.length > 0
      ? `Recent activity is coming from ${snapshot.topChannels.map((row) => `${row.channel} (${row.count})`).join(", ")}.`
      : snapshot.website?.publicUrl
        ? "A website is connected, but GroovGro has not recorded visits or campaign clicks yet. Add the tracking snippet and share the lead form."
        : "No website visits or campaign sources yet. Connect the existing website to start attributing leads."
    : "Context needs a connected website and Stripe data.";

  const inferredCount =
    (growth?.inferredOffers.length ?? 0) + (growth?.inferredGoals.length ?? 0);

  const attention = missing.length
    ? `Connect ${missing.join(" and ")} so people can sign in and organizations can be stored.`
    : inferredCount > 0
      ? `${inferredCount} suggested offer${inferredCount === 1 ? "" : "s or goals"} waiting. Open Next step to confirm or reject.`
    : snapshot && !snapshot.stripeConnected
      ? snapshot.stripeConfigured
        ? "Stripe keys are on Vercel, but this organization has not been marked as connected. Open Next step to connect so GroovGro can read a copy of payments."
        : "Stripe is not connected yet. Open Next step after test keys are on Vercel so GroovGro can read a copy of payments."
      : snapshot && snapshot.openLeadCount > 0
        ? `${snapshot.openLeadCount} lead${snapshot.openLeadCount === 1 ? "" : "s"} still need a next step. Open Next step to follow up.`
        : "Brand, website, and Stripe are in a good starting place. Add an event or a lead to see the dashboard fill in.";

  const ownerWork = partitionOwnerWork(growth?.actions ?? []);
  const latestWorkLearning = growth?.decisions.find((row) => row.outcome)?.outcome;
  const approvedPlan = growth?.plans.find(
    (plan) => plan.status === "approved" || plan.status === "active",
  );
  const storyBeats = buildGrowthStory(
    storyFactsFromWorkspace({
      businessName: session.organizationName ?? "",
      goal: growth?.activeGoals[0] ?? null,
      plan: approvedPlan ?? null,
      openWorkCount: ownerWork.open.length,
      finishedWorkCount: ownerWork.finished.length,
      latestLearning: latestWorkLearning ?? "",
      nextStep: nextStep
        ? {
            title: nextStep.primary.title,
            body: nextStep.primary.body,
            href: nextStep.primary.href,
          }
        : null,
    }),
  );

  const nextStepText = inferredCount > 0
    ? "Open Next step to confirm or reject what GroovGro drafted. Nothing becomes active until you confirm."
    : !snapshot?.website?.publicUrl
    ? "Open Next step to connect the existing website and paste the tracking snippet."
    : !snapshot.stripeConnected
      ? "Open Next step to connect so GroovGro can read a copy of payments."
      : "Open Next step if GroovGro names something to do. GroovGro will not start marketing.";

  const statusAlerts = buildStatusAlerts({
    signedIn: Boolean(session.email),
    organizationReady: Boolean(session.organizationId),
    missingServices: missing,
    websiteUrl: snapshot?.website?.publicUrl ?? "",
    websiteRead: websiteWasRead(growth?.brain?.inferredSummary),
    stripeConnected: snapshot?.stripeConnected ?? false,
    paymentCount: snapshot?.paymentCount ?? 0,
    recordedVisitCount:
      snapshot?.topChannels.reduce((total, row) => total + row.count, 0) ?? 0,
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          What is this business trying to accomplish, how is it doing, and
          what should happen next — only when there is enough evidence.
        </p>
      </div>

      <StatusAlertList alerts={statusAlerts} />

      {missing.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Finish cloud setup</CardTitle>
            <CardDescription>
              This site is live on Vercel. Add these hosted services in the
              Vercel project, then redeploy. Do not install them on your computer.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {missing.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {session.organizationName ?? "Your organization"}
            </CardTitle>
            <CardDescription>
              Signed in as {session.email}. Connected data stays. Goals and
              the Business Brain are now first-class. GroovGro will not change
              marketing by itself.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {session.organizationId ? <GrowthStoryCard beats={storyBeats} /> : null}

      {snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Open leads" value={String(snapshot.openLeadCount)} />
          <Stat label="Customers" value={String(snapshot.customerCount)} />
          <Stat label="Contacts" value={String(snapshot.contactCount)} />
          <Stat
            label="Payments this month"
            value={formatMoney(snapshot.paymentTotalCents)}
          />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <QuestionCard
          title="What are we trying to accomplish?"
          body={
            growth && growth.activeGoals.length > 0
              ? [
                  growth.activeGoals
                    .map((goal) =>
                      goal.progressPercent != null
                        ? `${goal.title} (${goal.liveCurrentValue}/${goal.targetValue ?? "—"}, ${goal.progressPercent}% )`
                        : goal.title,
                    )
                    .join(" · "),
                  growth.plans.find(
                    (plan) => plan.status === "approved" || plan.status === "active",
                  )
                    ? "An approved Growth Plan is ready. Propose the first actions on Next step. GroovGro will not run them."
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")
              : "No active Growth Goal yet. Open Next step or Goals to write the first measurable outcome."
          }
        />
        <QuestionCard title="How are we doing?" body={happening} />
        <QuestionCard
          title="What changed, and why?"
          body={latestWorkLearning ?? growth?.weeklyReview.whatChanged ?? why}
        />
        <QuestionCard
          title="What needs attention?"
          body={growth?.weeklyReview.whatNeedsAttention ?? attention}
        />
        <QuestionCard
          title="What should happen next?"
          body={
            nextStep
              ? `${nextStep.primary.title}. ${nextStep.waitingActions.length > 0 ? `${nextStep.waitingActions.length} proposed action${nextStep.waitingActions.length === 1 ? "" : "s"} still need your say. ` : ""}Open Next step to do it. GroovGro will not execute this.`
              : growth?.awaitingApproval.length
                ? `${growth.awaitingApproval.length} proposed action${growth.awaitingApproval.length === 1 ? "" : "s"} waiting. GroovGro will not execute them.`
                : (growth?.weeklyReview.whatShouldHappenNext ?? nextStepText)
          }
        />
        <QuestionCard
          title="What is GroovGro leaving alone?"
          body={
            growth?.weeklyReview.whatIsLeftAlone ??
            (growth?.latestNoChange
              ? growth.latestNoChange.recommendation
              : "Nothing recorded yet. If evidence is thin, the right recommendation is to wait. Open Growth review to see this week’s recommendation.")
          }
        />
      </div>

      {snapshot ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent leads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {snapshot.recentLeads.length === 0 ? (
                <p className="text-muted-foreground">
                  No leads yet. Use Leads & customers or the public form.
                </p>
              ) : (
                snapshot.recentLeads.map((lead) => (
                  <p key={lead.id}>
                    <span className="font-medium">{lead.name}</span>
                    {lead.email ? ` · ${lead.email}` : ""} · {lead.source}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {snapshot.upcomingEvents.length === 0 ? (
                <p className="text-muted-foreground">
                  No events yet. Add a class, workshop, or appointment.
                </p>
              ) : (
                snapshot.upcomingEvents.map((event) => (
                  <p key={event.id}>
                    <span className="font-medium">{event.title}</span>
                    {event.startsAt
                      ? ` · ${event.startsAt.toLocaleString()}`
                      : ""}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {isModuleEnabled(session.enabledModules, "website_connect") ? (
          <Button asChild variant="outline">
            <Link href="/app/website">Connect website</Link>
          </Button>
        ) : null}
        {leadFormUrl ? (
          <Button asChild variant="outline">
            <a href={leadFormUrl} target="_blank" rel="noreferrer">
              Open public lead form
            </a>
          </Button>
        ) : null}
        {isModuleEnabled(session.enabledModules, "business_brain") ? (
          <ReviewConnectedDataButton disabled={!session.organizationId} />
        ) : null}
        {isModuleEnabled(session.enabledModules, "growth_next") ? (
          <Button asChild>
            <Link href="/app/next-step">Next step</Link>
          </Button>
        ) : null}
        {isModuleEnabled(session.enabledModules, "growth_goals") ? (
          <Button asChild variant="outline">
            <Link href="/app/goals">Goals</Link>
          </Button>
        ) : null}
        {isModuleEnabled(session.enabledModules, "growth_work") ? (
          <Button asChild variant="outline">
            <Link href="/app/work">Your work</Link>
          </Button>
        ) : null}
        {isModuleEnabled(session.enabledModules, "growth_reviews") ? (
          <Button asChild variant="outline">
            <Link href="/app/growth-review">Growth review</Link>
          </Button>
        ) : null}
        {isModuleEnabled(session.enabledModules, "business_brain") ? (
          <Button asChild variant="outline">
            <Link href="/app/business">Business</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/app/crm">Leads & customers</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/commerce">Bookings & payments</Link>
        </Button>
        {isModuleEnabled(session.enabledModules, "intelligence") ? (
          <Button asChild variant="outline">
            <Link href="/app/intelligence">Intelligence and specialists</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function QuestionCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
