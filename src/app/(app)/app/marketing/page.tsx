import { getAppSession } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { getMarketingSnapshot } from "@/lib/phase3/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MarketingPage() {
  const session = await getAppSession();
  const snapshot = session.organizationId
    ? await getMarketingSnapshot(session.organizationId)
    : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
        <p className="text-muted-foreground">
          First look at campaign → lead → customer → revenue from the website
          snippet, the public form, and Stripe. This is not ads, SEO, or the
          website builder. Attribution is imperfect.
        </p>
      </div>

      {!snapshot ? (
        <p className="text-sm text-muted-foreground">
          Sign in to see marketing attribution.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Source to revenue</CardTitle>
            <CardDescription>
              Visits come from the tracking snippet. Leads come from the public
              form or people you add. Revenue counts Stripe charges only
              (the <code className="text-foreground">ch_</code> rows), so one
              checkout is not counted three times. Add{" "}
              <code className="text-foreground">?utm_source=</code> and{" "}
              <code className="text-foreground">?utm_campaign=</code> to links
              when you share the public form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sources yet. Keep the website snippet on the existing site
                and share the public lead form.
              </p>
            ) : (
              <>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Customers</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.rows.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell className="font-medium">{row.source}</TableCell>
                      <TableCell>{row.visits}</TableCell>
                      <TableCell>{row.leads}</TableCell>
                      <TableCell>{row.customers}</TableCell>
                      <TableCell>{formatMoney(row.revenueCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
                {snapshot.unattributedRevenueCents > 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {formatMoney(snapshot.unattributedRevenueCents)} in Stripe
                    charges has no person email yet, so it is listed as
                    unattributed.
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
