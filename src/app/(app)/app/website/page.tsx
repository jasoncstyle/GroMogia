import { eq } from "drizzle-orm";

import { saveWebsiteConnection } from "@/lib/actions/website";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { TrackingSnippet } from "@/components/tracking-snippet";
import { Button } from "@/components/ui/button";
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
  const [website] =
    db && session.organizationId
      ? await db
          .select()
          .from(websites)
          .where(eq(websites.organizationId, session.organizationId))
          .limit(1)
      : [];

  const base = appUrl();
  const snippet = website
    ? `<script src="${base}/t.js" data-gromogia-id="${website.trackingId}" async></script>`
    : "";
  const leadFormUrl = session.organizationSlug
    ? `${base}/l/${session.organizationSlug}`
    : "";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Website connection
        </h1>
        <p className="text-muted-foreground">
          Connect the site you already have. GroMogia does not replace it in
          this phase, and this is not the website builder.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing website</CardTitle>
          <CardDescription>
            Paste the public address of the site customers already use. GroMogia
            does not need to know who hosts it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveWebsiteConnection} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publicUrl">Website address</Label>
              <Input
                id="publicUrl"
                name="publicUrl"
                placeholder="https://example.com"
                defaultValue={website?.publicUrl ?? ""}
              />
            </div>
            <Button type="submit" disabled={!session.organizationId}>
              Save website
            </Button>
          </form>
        </CardContent>
      </Card>

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
            <TrackingSnippet snippet={snippet} leadFormUrl={leadFormUrl} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
