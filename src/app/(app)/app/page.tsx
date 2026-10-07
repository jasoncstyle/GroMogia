import { getAppSession } from "@/lib/auth/session";
import { missingFoundationServices } from "@/lib/env";
import { getCoordinatedNextStep, getGrowthSnapshot } from "@/lib/growth/queries";
import { getScoutGscExport } from "@/lib/growth/scout-proposal-query";
import {
  buildStatusAlerts,
  websiteWasRead,
} from "@/lib/growth/status-alerts";
import { formatMoney } from "@/lib/money";
import { getDashboardSnapshot } from "@/lib/phase2/queries";
import { StatusAlertList } from "@/components/status-alert";
import {
  OwnerActionLink,
  OwnerCard,
  OwnerIntro,
  OwnerPage,
} from "@/components/owner-surface/surface";
import {
  businessPulse,
  growBoards,
  recentWin,
} from "@/lib/owner-surface/boards";
import { greetingFor } from "@/lib/owner-surface/nav";
import { getExecutionRequests } from "@/lib/execute/queries";
import { partitionOwnerWork } from "@/lib/growth/owner-work";

function goalMovedUp(history?: { value: number }[]): boolean {
  if (!history || history.length < 2) return false;
  const first = history[history.length - 1]?.value;
  const latest = history[0]?.value;
  return first != null && latest != null && latest > first;
}

export default async function HomePage() {
  const session = await getAppSession();
  const missing = missingFoundationServices();
  const [snapshot, growth, nextStep, searchExport, executionRequests] = session.organizationId
    ? await Promise.all([
        getDashboardSnapshot(session.organizationId),
        getGrowthSnapshot(session.organizationId),
        getCoordinatedNextStep(session.organizationId),
        getScoutGscExport(session.organizationId),
        getExecutionRequests(session.organizationId),
      ])
    : [null, null, null, null, []];

  const greeting = greetingFor(session.name, session.organizationName);
  const primaryGoal = growth?.activeGoals[0] ?? null;
  const work = partitionOwnerWork(growth?.actions ?? []);
  const pulse = businessPulse({
    openLeadCount: snapshot?.openLeadCount,
    customerCount: snapshot?.customerCount,
    paymentCount: snapshot?.paymentCount,
    paymentTotalLabel: snapshot ? formatMoney(snapshot.paymentTotalCents) : undefined,
    stripeConnected: snapshot?.stripeConnected,
    goalTitle: primaryGoal?.title,
    goalProgressLabel:
      primaryGoal?.progressPercent != null
        ? `${primaryGoal.liveCurrentValue} of ${primaryGoal.targetValue ?? "—"}. From stored Goal numbers.`
        : undefined,
    goalProgressPercent: primaryGoal?.progressPercent ?? null,
    goalLiveComputable: primaryGoal?.liveComputable,
    websiteConnected: Boolean(snapshot?.website?.publicUrl),
    websiteRead: websiteWasRead(growth?.brain?.inferredSummary),
    searchClicks: searchExport?.totals.clicks ?? null,
  });
  const boards = growBoards({
    primary: nextStep?.primary
      ? {
          title: nextStep.primary.title,
          body: nextStep.primary.body,
          href: "/app/grow",
        }
      : null,
  });
  const win = recentWin({
    latestLearning: growth?.decisions.find((row) => row.outcome)?.outcome,
    finishedWorkCount: work.finished.length,
    goalMovedUp: goalMovedUp(primaryGoal?.progressHistory),
    goalTitle: primaryGoal?.title,
  });
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
  }).filter((alert) => alert.tone !== "ok");
  const preparingCount =
    (growth?.awaitingApproval.length ?? 0) +
    (nextStep?.inferredDrafts.length ?? 0) +
    executionRequests.length;
  const needsYouCount = work.open.length + work.waiting.length;

  return (
    <OwnerPage>
      <OwnerIntro eyebrow={session.organizationName ?? "Your business"} title={greeting.hello}>
        <p>{greeting.context}</p>
      </OwnerIntro>

      {pulse.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {pulse.map((item) => (
            <OwnerCard
              key={item.id}
              eyebrow="Business Pulse"
              title={item.value}
              description={item.hint}
              evidence={item.evidence}
            >
              <p className="text-sm font-medium">{item.label}</p>
            </OwnerCard>
          ))}
        </div>
      ) : (
        <OwnerCard
          eyebrow="Business Pulse"
          title="Not enough stored numbers yet"
          description="GroovGro only shows counts it already has for this business. It will not invent a metric."
          evidence="unknown"
        />
      )}

      <OwnerCard
        eyebrow="Best Next Move"
        title={boards.best?.title ?? "Nothing is asking for you right now"}
        description={
          boards.best?.body ??
          "When GroovGro has a useful next move from stored data, it will show here."
        }
        action={
          <OwnerActionLink href="/app/grow">
            {boards.best ? "Open Grow" : "See Grow"}
          </OwnerActionLink>
        }
      />

      <OwnerCard
        eyebrow="GroovGro is working"
        title={
          preparingCount > 0
            ? "GroovGro is working on it"
            : "GroovGro is watching this business"
        }
        description={
          preparingCount > 0
            ? `${preparingCount} prepared item${preparingCount === 1 ? "" : "s"} are waiting in Work. GroovGro has not run them outside this workspace.`
            : "No outside work is running. GroovGro reads what you already connected and prepares suggestions."
        }
        action={<OwnerActionLink href="/app/work?tab=working" variant="outline">Open Work</OwnerActionLink>}
      />

      {win ? (
        <OwnerCard eyebrow="Recent win" title={win.title} description={win.body} />
      ) : null}

      <OwnerCard
        eyebrow="Needs your attention"
        title={
          needsYouCount > 0
            ? `${needsYouCount} item${needsYouCount === 1 ? "" : "s"} need you`
            : statusAlerts.length > 0
              ? "A few things still need a look"
              : "Nothing is waiting on you"
        }
        description={
          needsYouCount > 0
            ? "Approve, reject, or do the work yourself. GroovGro will not start marketing."
            : "When a draft, approval, or saved website still needs you, it will show here."
        }
      >
        <StatusAlertList alerts={statusAlerts} />
        {needsYouCount > 0 ? (
          <OwnerActionLink href="/app/work?tab=needs-you">Review what needs you</OwnerActionLink>
        ) : null}
      </OwnerCard>

      <OwnerCard
        eyebrow="What to do now"
        title={boards.best ? boards.best.title : "Look at Grow"}
        action={
          <div className="flex flex-wrap gap-2">
            <OwnerActionLink href="/app/grow">
              {boards.best ? "Do the next move" : "Open Grow"}
            </OwnerActionLink>
            <OwnerActionLink href="/app/business" variant="outline">
              Check Business
            </OwnerActionLink>
          </div>
        }
      />
    </OwnerPage>
  );
}
