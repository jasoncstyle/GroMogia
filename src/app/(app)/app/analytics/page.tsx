import { getAppSession } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { getDashboardSnapshot } from "@/lib/phase2/queries";
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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Basic outcomes from connected data. Open Marketing for campaign →
          lead → customer → revenue.
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

          <Card>
            <CardHeader>
              <CardTitle>Traffic and sources</CardTitle>
              <CardDescription>
                From the website snippet and the public lead form. Campaign
                detail expands later.
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
