import { getAppSession } from "@/lib/auth/session";
import { getGa4PageData } from "@/lib/ga4/query";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { getScoutGscExport } from "@/lib/growth/scout-proposal-query";
import { formatMoney } from "@/lib/money";
import { getDashboardSnapshot } from "@/lib/phase2/queries";
import { partitionOwnerWork } from "@/lib/growth/owner-work";
import {
  OwnerActionLink,
  OwnerCard,
  OwnerIntro,
  OwnerPage,
} from "@/components/owner-surface/surface";

export default async function ResultsPage() {
  const session = await getAppSession();
  const [snapshot, growth, ga4, searchExport] = session.organizationId
    ? await Promise.all([
        getDashboardSnapshot(session.organizationId),
        getGrowthSnapshot(session.organizationId),
        getGa4PageData(session.organizationId),
        getScoutGscExport(session.organizationId),
      ])
    : [null, null, null, null];

  const goal = growth?.activeGoals[0] ?? null;
  const work = partitionOwnerWork(growth?.actions ?? []);
  const review = growth?.weeklyReview;
  const ga4Latest = ga4?.snapshots[0];
  const helping =
    goal?.progressPercent != null
      ? "There is a stored Goal number to compare."
      : work.finished.length > 0
        ? "Some work is marked done. That is not the same as a proven result."
        : "Not enough stored evidence yet to say GroovGro is helping.";

  return (
    <OwnerPage>
      <OwnerIntro title="Results">
        <p>Is GroovGro helping? Only stored numbers and saved looks belong here. Estimates stay labeled.</p>
      </OwnerIntro>

      <OwnerCard
        eyebrow="The honest answer"
        title={helping}
        description="GroovGro will not claim a sale, a search win, or a revenue lift it cannot show from this business&apos;s stored data."
        evidence={goal?.liveComputable ? "measured" : goal ? "estimated" : "unknown"}
      />

      {goal ? (
        <OwnerCard
          eyebrow="Goal"
          title={goal.title}
          description={
            goal.progressPercent != null
              ? `${goal.liveCurrentValue} of ${goal.targetValue ?? "—"}. ${goal.liveComputable ? "Measured from stored Goal numbers." : "Estimated from what is already saved."}`
              : "A Goal is saved. GroovGro does not have enough numbers to score it yet."
          }
          evidence={
            goal.progressPercent != null
              ? goal.liveComputable
                ? "measured"
                : "estimated"
              : "unknown"
          }
        />
      ) : (
        <OwnerCard
          eyebrow="Goal"
          title="No active Goal yet"
          description="Without a Goal, Results can only show stored counts. Add one on Business."
          evidence="unknown"
          action={
            <OwnerActionLink href="/app/business?section=goals" variant="outline">
              Open Goals
            </OwnerActionLink>
          }
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <OwnerCard
          eyebrow="People"
          title={String(snapshot?.customerCount ?? 0)}
          description={`${snapshot?.openLeadCount ?? 0} open lead${snapshot?.openLeadCount === 1 ? "" : "s"}, ${snapshot?.customerCount ?? 0} customer${snapshot?.customerCount === 1 ? "" : "s"}. Stored records only.`}
          evidence={snapshot ? "measured" : "unknown"}
        />
        <OwnerCard
          eyebrow="Payments"
          title={snapshot ? formatMoney(snapshot.paymentTotalCents) : "Unknown"}
          description={
            snapshot?.stripeConnected
              ? `${snapshot.paymentCount} stored payment${snapshot.paymentCount === 1 ? "" : "s"} this month. GroovGro does not charge cards.`
              : "No payment copy is connected for this business."
          }
          evidence={snapshot?.stripeConnected && snapshot.paymentCount > 0 ? "measured" : "unknown"}
        />
      </div>

      {searchExport ? (
        <OwnerCard
          eyebrow="Search Console"
          title={`${searchExport.totals.clicks} clicks`}
          description={`${searchExport.startDate} – ${searchExport.endDate}. Stored Search Console copy. Not a traffic forecast.`}
          evidence="measured"
        />
      ) : (
        <OwnerCard
          eyebrow="Search Console"
          title="No stored search copy yet"
          description="Connect Search Console in Settings when you want GroovGro to read those numbers. It stays read-only."
          evidence="unknown"
        />
      )}

      {ga4?.connected && ga4Latest ? (
        <OwnerCard
          eyebrow="Website visits"
          title={`${ga4Latest.totals.sessions} sessions`}
          description={`${ga4Latest.startDate} – ${ga4Latest.endDate}. Stored Google Analytics copy. GroovGro does not buy ads.`}
          evidence="measured"
        />
      ) : (
        <OwnerCard
          eyebrow="Website visits"
          title="No Analytics copy yet"
          description="A read-only Google Analytics connection can live in Settings. Until then this stays unknown."
          evidence="unknown"
        />
      )}

      {review ? (
        <OwnerCard
          eyebrow="This week&apos;s look"
          title={review.headline}
          description={review.howWeAreDoing}
        >
          <p className="text-sm leading-relaxed text-muted-foreground">{review.summary}</p>
        </OwnerCard>
      ) : null}

      <OwnerCard
        eyebrow="Finished work"
        title={
          work.finished.length > 0
            ? `${work.finished.length} marked done`
            : "No finished work yet"
        }
        description="Done means you marked it. It does not mean GroovGro ran something outside this workspace."
        evidence={work.finished.length > 0 ? "measured" : "unknown"}
        action={
          <div className="flex flex-wrap gap-2">
            <OwnerActionLink href="/app/work?tab=finished" variant="outline">
              Open finished work
            </OwnerActionLink>
            <OwnerActionLink href="/app/analytics" variant="outline">
              Open detailed tables
            </OwnerActionLink>
          </div>
        }
      />
    </OwnerPage>
  );
}
