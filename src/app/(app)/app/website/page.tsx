import { eq } from "drizzle-orm";

import { saveWebsiteConnection } from "@/lib/actions/website";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { appUrl, missingFoundationServices } from "@/lib/env";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import {
  buildStatusAlerts,
  websiteWasRead,
} from "@/lib/growth/status-alerts";
import { resolveOrganizationSlug } from "@/lib/org";
import { CopyLink } from "@/components/copy-link";
import { SaveButton, SaveForm } from "@/components/save-form";
import { StatusAlertList } from "@/components/status-alert";
import { TrackingSnippet } from "@/components/tracking-snippet";
import { WebsiteUpdateExpectation } from "@/components/website-update-expectation";
import { OpenNextStepLink } from "@/components/open-next-step-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function WebsitePage() {
  const session = await getAppSession();
  const db = getDb();
  const [websiteRows, growth, slug] = await Promise.all([
    db && session.organizationId
      ? db
          .select()
          .from(websites)
          .where(eq(websites.organizationId, session.organizationId))
          .limit(1)
      : Promise.resolve([]),
    session.organizationId
      ? getGrowthSnapshot(session.organizationId)
      : Promise.resolve(null),
    resolveOrganizationSlug(session.organizationId, session.organizationSlug),
  ]);
  const [website] = websiteRows;

  const base = appUrl();
  const snippet = website
    ? `<script src="${base}/t.js" data-groovgro-id="${website.trackingId}" data-gromogia-id="${website.trackingId}" async></script>`
    : "";
  const leadFormUrl = slug ? `${appUrl()}/l/${slug}` : "";
  const statusAlerts = buildStatusAlerts({
    signedIn: Boolean(session.email),
    organizationReady: Boolean(session.organizationId),
    missingServices: missingFoundationServices(),
    websiteUrl: website?.publicUrl ?? "",
    websiteRead: websiteWasRead(growth?.brain?.inferredSummary),
    stripeConnected: false,
    paymentCount: 0,
    recordedVisitCount: 0,
    topics: ["workspace", "website"],
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Website connection
        </h1>
        <p className="text-muted-foreground">
          Connect the site you already have. GroovGro does not replace it in
          this phase. The optional GroovGro website builder is a separate page
          and does not overwrite this connection.
        </p>
      </div>

      <StatusAlertList alerts={statusAlerts} />

      <WebsiteUpdateExpectation />

      {leadFormUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>Public lead form</CardTitle>
            <CardDescription>
              This is a GroovGro page customers can open without signing in.
              Copy the link, open it in a private window, and send a test lead
              with an email that is not yours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CopyLink url={leadFormUrl} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Public lead form</CardTitle>
            <CardDescription>
              Sign in with the database connected, then this page will show a
              shareable form link for this organization.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Existing website</CardTitle>
          <CardDescription>
            Paste the public address of the site customers already use. Saving
            it does not read the pages. After you save, open Next step to find
            pages, check the important ones, then review. GroovGro does not
            change the live site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SaveForm action={saveWebsiteConnection} successMessage="Website saved" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publicUrl">Website address</Label>
              <Input
                id="publicUrl"
                name="publicUrl"
                placeholder="https://example.com"
                defaultValue={website?.publicUrl ?? ""}
              />
            </div>
            <SaveButton type="submit" disabled={!session.organizationId}>
              Save website
            </SaveButton>
          </SaveForm>
        </CardContent>
      </Card>

      {website?.publicUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>Pages GroovGro should read</CardTitle>
            <CardDescription>
              Find pages and check the important ones on Next step, then
              review. GroovGro does not change the live site.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {website ? (
        <Card>
          <CardHeader>
            <CardTitle>Tracking snippet</CardTitle>
            <CardDescription>
              Add this once on the existing site. Keep this page open while you
              do it. No popup — the steps stay here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrackingSnippet snippet={snippet} />
          </CardContent>
        </Card>
      ) : null}

      <OpenNextStepLink />
    </div>
  );
}
