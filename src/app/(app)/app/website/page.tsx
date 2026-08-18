import { eq } from "drizzle-orm";

import { saveWebsiteConnection } from "@/lib/actions/website";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
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

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

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
            SiteGround, WordPress, or any public URL. Tracking is a small
            snippet you paste once.
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
            <div className="space-y-2">
              <Label htmlFor="provider">Where it is hosted</Label>
              <select
                id="provider"
                name="provider"
                className={selectClassName}
                defaultValue={website?.provider ?? "other"}
              >
                <option value="siteground">SiteGround</option>
                <option value="wordpress">WordPress</option>
                <option value="other">Other</option>
              </select>
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
              Paste this before the closing body tag on the existing site. It
              records visits and campaign links without storing card data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              readOnly
              className="min-h-24 w-full rounded-lg border bg-muted/40 p-3 font-mono text-xs"
              value={snippet}
            />
            {leadFormUrl ? (
              <p className="text-sm text-muted-foreground">
                Public lead form:{" "}
                <a className="underline" href={leadFormUrl}>
                  {leadFormUrl}
                </a>
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
