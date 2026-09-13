import Link from "next/link";

import { getAppSession } from "@/lib/auth/session";
import { getGa4PageData, ga4Notice } from "@/lib/ga4/query";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { formatMoney } from "@/lib/money";
import { getDashboardSnapshot } from "@/lib/phase2/queries";
import { Ga4Panel } from "@/components/ga4-panel";
import { GoalShareNote } from "@/components/goal-share-note";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OpenNextStepLink } from "@/components/open-next-step-link";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ ga4?: string; error?: string }>
}) {
  const params = await searchParams;
  const session = await getAppSession();
  const snapshot = session.organizationId
    ? await getDashboardSnapshot(session.organizationId)
    : null;
  const ga4 = session.organizationId
    ? await getGa4PageData(session.organizationId)
    : null;
  const growth = session.organizationId
    ? await getGrowthSnapshot(session.organizationId)
    : null;
  const goalShare = (growth?.activeGoals ?? []).find((goal) => goal.shareNote);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Basic outcomes from connected data, plus a read-only GA4 snapshot
          when you connect it. Open Marketing for campaign → lead → customer →
          revenue, including the share name. Open Next step to read which
          share moved the Goal number. GroovGro will not buy ads.
        </p>
      </div>

      {!snapshot ? (
        <p className="text-sm text-muted-foreground">Sign in to see analytics.</p>
      ) : (
        <>
          {ga4 ? (
            <Ga4Panel
              analytics={ga4}
              notice={ga4Notice(params.ga4, params.error)}
              canManage={
                session.permissions.includes("manage_seo") ||
                session.permissions.includes("manage_integrations")
              }
            />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Contacts</CardDescription>
                <CardTitle>{snapshot.contactCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Customers</CardDescription>
                <CardTitle>{snapshot.customerCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Revenue this month</CardDescription>
                <CardTitle>{formatMoney(snapshot.paymentTotalCents)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {goalShare ? (
            <Card>
              <CardHeader>
                <CardTitle>{goalShare.title}</CardTitle>
                <CardDescription>
                  Which named share moved this Goal number. Open Next step to
                  read the Goal. Naming a share stays on Marketing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoalShareNote
                  note={goalShare.shareNote}
                  rows={goalShare.shareRows}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Traffic and sources</CardTitle>
              <CardDescription>
                From the website snippet and the public lead form. Open{" "}
                <Link href="/app/marketing" className="underline">
                  Marketing
                </Link>{" "}
                to see the share name for each source. GroovGro will not buy
                ads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {snapshot.topChannels.length === 0 ? (
                <p className="text-muted-foreground">
                  No visits or form sources yet. Connect the website and paste
                  the snippet.
                </p>
              ) : (
                snapshot.topChannels.map((row) => (
                  <p key={row.channel}>
                    <span className="font-medium">{row.channel}</span> · {row.count}{" "}
                    {row.count === 1 ? "touch" : "touches"}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      <OpenNextStepLink />
    </div>
  );
}
