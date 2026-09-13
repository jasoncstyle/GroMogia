import Link from "next/link";
import {
  CreditCard,
  Target,
  UserRound,
  Users,
} from "lucide-react";

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
import { extraShareClause } from "@/lib/growth/progress";
import { getCoordinatedNextStep, getGrowthSnapshot } from "@/lib/growth/queries";
import {
  getScoutGscExport,
  getScoutProposalInbox,
} from "@/lib/growth/scout-proposal-query";
import { SCOUT_STATUS_PROPOSED } from "@/lib/growth/scout-proposals";
import {
  buildStatusAlerts,
  websiteWasRead,
} from "@/lib/growth/status-alerts";
import { formatLeadOrigin } from "@/lib/marketing/named-link";
import { formatMoney } from "@/lib/money";
import { resolveOrganizationSlug } from "@/lib/org";
import { isModuleEnabled } from "@/lib/modules/catalog";
import { getDashboardSnapshot } from "@/lib/phase2/queries";
import { GoalShareNote } from "@/components/goal-share-note";
import { StatusAlertList } from "@/components/status-alert";
import {
  DeskBars,
  DeskKpi,
  DeskRing,
  DeskSparkline,
  DeskSplit,
} from "@/components/visual-desk";

export default async function DashboardPage() {
  const session = await getAppSession();
  const missing = missingFoundationServices();
  const slug = await resolveOrganizationSlug(
    session.organizationId,
    session.organizationSlug,
  );
  const leadFormUrl = slug ? `${appUrl()}/l/${slug}` : "";
  const [snapshot, growth, nextStep, searchExport, seogroInbox] = session.organizationId
    ? await Promise.all([
        getDashboardSnapshot(session.organizationId),
        getGrowthSnapshot(session.organizationId),
        getCoordinatedNextStep(session.organizationId),
        getScoutGscExport(session.organizationId),
        getScoutProposalInbox(session.organizationId),
      ])
    : [null, null, null, null, { heading: "SEOgro proposals", items: [] }];

  const happening = snapshot
    ? `${snapshot.openLeadCount} open lead${snapshot.openLeadCount === 1 ? "" : "s"}, ${snapshot.customerCount} customer${snapshot.customerCount === 1 ? "" : "s"}, and ${formatMoney(snapshot.paymentTotalCents)} in payments this month.`
    : "Sign in to see live counts for this organization.";

  const goalWithShare = (growth?.activeGoals ?? []).find((goal) => goal.shareNote);
  const goalShare = goalWithShare?.shareNote;
  const why = snapshot
    ? [
        snapshot.topChannels.length > 0
          ? `Recent activity is coming from ${snapshot.topChannels.map((row) => `${row.channel} (${row.count})`).join(", ")}. Open Marketing to see the share name for each source. GroovGro will not buy ads.`
          : snapshot.website?.publicUrl
            ? "A website is connected, but GroovGro has not recorded visits or campaign clicks yet. Add the tracking snippet and share the lead form."
            : "No website visits or campaign sources yet. Connect the existing website to start attributing leads.",
        goalShare
          ? `${goalShare}${extraShareClause(goalWithShare?.shareRows)} Read the Goal on Next step.`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
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

  const latestWorkLearning = growth?.decisions.find((row) => row.outcome)?.outcome;

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

  const primaryGoal = growth?.activeGoals[0] ?? null;
  const approvedPlan = growth?.plans.find(
    (plan) => plan.status === "approved" || plan.status === "active",
  );
  const goalHistory = [...(primaryGoal?.progressHistory ?? [])]
    .reverse()
    .map((row) => row.value);
  const seogroProposed = seogroInbox.items.filter(
    (item) => item.status === SCOUT_STATUS_PROPOSED,
  ).length;
  const searchRange = searchExport
    ? `${searchExport.startDate} – ${searchExport.endDate}`
    : "This month";
  const nextStepBody = nextStep
    ? `${nextStep.primary.title}. ${nextStep.waitingActions.length > 0 ? `${nextStep.waitingActions.length} proposed action${nextStep.waitingActions.length === 1 ? "" : "s"} still need your say. ` : ""}Open Next step to do it. GroovGro will not execute this.`
    : growth?.awaitingApproval.length
      ? `${growth.awaitingApproval.length} proposed action${growth.awaitingApproval.length === 1 ? "" : "s"} waiting. GroovGro will not execute them.`
      : (growth?.weeklyReview.whatShouldHappenNext ?? nextStepText);
  const channelTones = ["one", "two", "three"] as const;

  return (
    <div className="-mx-4 -my-6 min-h-full bg-zinc-50 px-4 py-8 md:-mx-6 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              What is this business trying to accomplish, how is it doing, and
              what should happen next — only when there is enough evidence. Read
              the path so far on Next step.
            </p>
          </div>
          <p className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-foreground/10">
            {searchRange}
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
          <p className="text-sm text-muted-foreground">
            {session.organizationName ?? "Your organization"} · signed in as{" "}
            {session.email}. Connected data stays. Goals and the Business Brain
            are now first-class. GroovGro will not change marketing by itself.
          </p>
        )}

        {snapshot ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DeskKpi
              label="Open leads"
              value={String(snapshot.openLeadCount)}
              hint="People still waiting on a next step"
              icon={<UserRound className="size-4" />}
            />
            <DeskKpi
              label="Customers"
              value={String(snapshot.customerCount)}
              hint="Won records in this organization"
              icon={<Users className="size-4" />}
            />
            <DeskKpi
              label="Contacts"
              value={String(snapshot.contactCount)}
              hint="People GroovGro already knows"
              icon={<Users className="size-4" />}
            />
            <DeskKpi
              label="Payments this month"
              value={formatMoney(snapshot.paymentTotalCents)}
              hint={`${snapshot.paymentCount} stored payment${snapshot.paymentCount === 1 ? "" : "s"}`}
              icon={<CreditCard className="size-4" />}
            />
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
          <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  What are we trying to accomplish?
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  {primaryGoal?.title ?? "No active Growth Goal yet"}
                </h2>
              </div>
              <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Target className="size-4" />
              </span>
            </div>
            {growth && growth.activeGoals.length > 0 ? (
              <div className="mt-4 space-y-4">
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {primaryGoal?.progressPercent != null
                    ? `${primaryGoal.liveCurrentValue}/${primaryGoal.targetValue ?? "—"}`
                    : (primaryGoal?.title ?? "")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[
                    growth.activeGoals
                      .map((goal) =>
                        goal.progressPercent != null
                          ? `${goal.title} (${goal.liveCurrentValue}/${goal.targetValue ?? "—"}, ${goal.progressPercent}% )`
                          : goal.title,
                      )
                      .join(" · "),
                    approvedPlan
                      ? "An approved Growth Plan is ready. Propose the first actions on Next step. GroovGro will not run them."
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                <DeskSparkline
                  values={goalHistory}
                  label="Stored Goal progress over recorded snapshots"
                />
                {growth.activeGoals.map((goal) =>
                  goal.shareNote ? (
                    <GoalShareNote
                      key={goal.id}
                      note={goal.shareNote}
                      rows={goal.shareRows}
                    />
                  ) : null,
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No active Growth Goal yet. Open Next step to write the first measurable outcome.
              </p>
            )}
          </div>
          <DeskRing
            percent={primaryGoal?.progressPercent ?? null}
            label="Goal progress"
            caption={
              primaryGoal?.progressPercent != null
                ? "From stored Goal numbers, not a guess."
                : "The ring fills after a measurable Goal is active."
            }
          />
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            What should happen next?
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight">
            {nextStep?.primary.title ?? "One next step"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{nextStepBody}</p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/app/next-step">Open Next step</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Stored searches
                </p>
                <h2 className="mt-1 text-base font-semibold">
                  Search Console · top queries
                </h2>
              </div>
              {searchExport ? (
                <p className="text-right">
                  <span className="block text-2xl font-semibold tabular-nums">
                    {searchExport.totals.clicks}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    clicks in the stored range
                  </span>
                </p>
              ) : null}
            </div>
            <DeskBars
              rows={(searchExport?.queries ?? []).slice(0, 6).map((row) => ({
                label: row.query,
                value: row.impressions || row.clicks,
                hint: `${row.clicks} clicks · ${row.impressions} seen`,
              }))}
              empty="No stored Search Console queries yet. Refresh Search Console on the Search desk. GroovGro will not invent traffic."
            />
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Named shares
              </p>
              <h2 className="mt-1 mb-4 text-base font-semibold">Visits by source</h2>
              <DeskSplit
                rows={(snapshot?.topChannels ?? []).slice(0, 3).map((row, index) => ({
                  label: row.channel,
                  value: row.count,
                  tone: channelTones[index] ?? "one",
                }))}
                empty="No named-share visits yet. Add the tracking snippet and share the lead form."
              />
            </div>
            <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {seogroInbox.heading}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {seogroProposed}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                SEOgro proposals waiting for Monday review. SEOgro reads stored
                Search Console. It does not log into Google or publish.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/app/seo">Open Search desk</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
            title="What is GroovGro leaving alone?"
            body={
              growth?.weeklyReview.whatIsLeftAlone ??
              (growth?.latestNoChange
                ? growth.latestNoChange.recommendation
                : "Nothing recorded yet. If evidence is thin, the right recommendation is to wait. Open Next step to see this week’s recommendation.")
            }
          />
        </div>

        {snapshot ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10">
              <div className="border-b px-5 py-4">
                <h2 className="text-base font-semibold">Recent leads</h2>
              </div>
              {snapshot.recentLeads.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">
                  No leads yet. Open Next step to copy the public form or add a
                  person. GroovGro will not email anyone.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                      <tr className="border-b">
                        <th className="px-5 py-3 font-medium">Name</th>
                        <th className="px-5 py-3 font-medium">Share</th>
                        <th className="px-5 py-3 font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.recentLeads.map((lead) => {
                        const origin = formatLeadOrigin(lead.source, lead.campaign);
                        return (
                          <tr key={lead.id} className="border-b last:border-0">
                            <td className="px-5 py-3 font-medium">{lead.name}</td>
                            <td className="px-5 py-3 text-muted-foreground">
                              {origin || "—"}
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">
                              {lead.email || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
              <h2 className="text-base font-semibold">Upcoming events</h2>
              <div className="mt-4 space-y-3 text-sm">
                {snapshot.upcomingEvents.length === 0 ? (
                  <p className="text-muted-foreground">
                    No events yet. Open Next step to add a calendar item if that
                    is how this business sells.
                  </p>
                ) : (
                  snapshot.upcomingEvents.map((event) => (
                    <p key={event.id} className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{event.title}</span>
                      <span className="text-muted-foreground">
                        {event.startsAt ? event.startsAt.toLocaleString() : ""}
                      </span>
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {isModuleEnabled(session.enabledModules, "website_connect") ? (
            <Button asChild variant="outline">
              <Link href="/app/next-step">Connect website</Link>
            </Button>
          ) : null}
          {leadFormUrl ? (
            <Button asChild variant="outline">
              <a href={leadFormUrl} target="_blank" rel="noreferrer">
                Open public lead form
              </a>
            </Button>
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
              <Link href="/app/intelligence">Intelligence</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
