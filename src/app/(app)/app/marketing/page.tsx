import Link from "next/link";

import { getAppSession } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { resolveOrganizationSlug } from "@/lib/org";
import { getMarketingSnapshot } from "@/lib/phase3/queries";
import { NamedLeadFormLink } from "@/components/named-lead-form-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OpenNextStepLink } from "@/components/open-next-step-link";
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
  const slug = session.organizationId
    ? await resolveOrganizationSlug(
        session.organizationId,
        session.organizationSlug,
      )
    : "";
  const leadFormUrl = slug ? `${appUrl()}/l/${slug}` : "";
  const websiteUrl = snapshot?.websiteUrl ?? "";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
        <p className="text-muted-foreground">
          First look at campaign → lead → customer → revenue from the website
          snippet, the public form, and Stripe. Name a share below. When
          someone uses that named link, the place you typed shows as the
          source and the name you typed shows as the share name. GroovGro
          will not buy ads.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Name a campaign on a shared link</CardTitle>
          <CardDescription>
            Type where you will share the public lead form and a name for this
            share, then copy the link into the post or message you already
            write. GroovGro will not buy ads, send email, or change the live
            website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leadFormUrl ? (
            <NamedLeadFormLink baseUrl={leadFormUrl} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in so GroovGro can build your public lead form link.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Name a campaign on a website link</CardTitle>
          <CardDescription>
            Type where you will share the existing website and a name for this
            share, then copy the link. GroovGro will not buy ads, send email,
            or change the live website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {websiteUrl ? (
            <NamedLeadFormLink
              baseUrl={websiteUrl}
              idPrefix="website-utm"
              openLabel="Open page"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Save the existing website address on Next step first. GroovGro
              does not move the live site.
            </p>
          )}
        </CardContent>
      </Card>

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
              checkout is not counted three times. Share name is the name you
              typed for that link. GroovGro will not buy ads.
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
                    <TableHead>Share name</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Customers</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.rows.map((row) => (
                    <TableRow key={`${row.source}::${row.campaign}`}>
                      <TableCell className="font-medium">{row.source}</TableCell>
                      <TableCell>{row.campaign || "—"}</TableCell>
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
                    unattributed. Match those on{" "}
                    <Link href="/app/commerce" className="underline">
                      Bookings
                    </Link>
                    . GroovGro will not change checkout.
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <OpenNextStepLink />
    </div>
  );
}
