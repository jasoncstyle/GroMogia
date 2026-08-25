import Link from "next/link";

import { getAppSession } from "@/lib/auth/session";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { formatMoney } from "@/lib/money";
import { getDashboardSnapshot } from "@/lib/phase2/queries";
import { GoalShareNote } from "@/components/goal-share-note";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OpenNextStepLink } from "@/components/open-next-step-link";

export default async function AnalyticsPage() {
  const session = await getAppSession();
  const snapshot = session.organizationId
    ? await getDashboardSnapshot(session.organizationId)
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
          Basic outcomes from connected data. Open Marketing for campaign →
          lead → customer → revenue, including the share name. Open Next step
          to read which share moved the Goal number. GroovGro will not buy
          ads.
        </p>
      </div>

      {!snapshot ? (
        <p className="text-sm text-muted-foreground">Sign in to see analytics.</p>
      ) : (
        <>
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
