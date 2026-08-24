import Link from "next/link";

import {
  disconnectSearchConsole,
  selectSearchConsoleProperty,
  syncSearchConsole,
} from "@/lib/actions/search-console";
import { explainSearchConsole } from "@/lib/seo/search-console";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { getSeoPageData } from "@/lib/phase6/queries";

type SearchConsoleState = Awaited<ReturnType<typeof getSeoPageData>>["searchConsole"];

export function SearchConsolePanel({
  searchConsole,
  notice,
  embedded = false,
  canManage = true,
}: {
  searchConsole: SearchConsoleState
  notice: string | null
  embedded?: boolean
  canManage?: boolean
}) {
  const latest = searchConsole.snapshots[0] ?? null;
  const explanation = latest
    ? explainSearchConsole({
        propertyUrl: latest.propertyUrl,
        startDate: latest.startDate,
        endDate: latest.endDate,
        totals: latest.totals,
        topQueries: latest.topQueries,
        topPages: latest.topPages,
      })
    : null;

  const body = (
    <>
      {notice ? (
        <p className="text-sm text-muted-foreground">{notice}</p>
      ) : null}

      {!searchConsole.configured ? (
        <p className="text-sm text-muted-foreground">
          Add <code className="text-foreground">GOOGLE_CLIENT_ID</code> and{" "}
          <code className="text-foreground">GOOGLE_CLIENT_SECRET</code> in the
          Vercel project, then redeploy. Click-by-click steps are in
          docs/phase-6/USER_SETUP.md.
        </p>
      ) : null}

      {searchConsole.configured && !searchConsole.connected ? (
        canManage ? (
          <Button asChild>
            <Link href="/api/google/start">Connect Search Console</Link>
          </Button>
        ) : (
          <Button disabled>Connect Search Console</Button>
        )
      ) : null}

      {searchConsole.connected &&
      !searchConsole.propertyUrl &&
      searchConsole.candidates.length > 0 ? (
        <SaveForm
          action={selectSearchConsoleProperty}
          successMessage="Search Console property saved."
          className="space-y-3"
        >
          <div className="space-y-2">
            <Label htmlFor="siteUrl">Search Console property</Label>
            <select
              id="siteUrl"
              name="siteUrl"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              defaultValue={searchConsole.candidates[0]}
              disabled={!canManage}
            >
              {searchConsole.candidates.map((siteUrl) => (
                <option key={siteUrl} value={siteUrl}>
                  {siteUrl}
                </option>
              ))}
            </select>
          </div>
          <SaveButton disabled={!canManage}>Use this property</SaveButton>
        </SaveForm>
      ) : null}

      {searchConsole.connected &&
      !searchConsole.propertyUrl &&
      searchConsole.candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Google is connected, but this Google account has no Search Console
          property that matches the connected website. Add the site in Google
          Search Console, then refresh.
        </p>
      ) : null}

      {searchConsole.connected && searchConsole.propertyUrl ? (
        <p className="text-sm">
          Property: <span className="font-medium">{searchConsole.propertyUrl}</span>
          {searchConsole.lastSyncAt
            ? ` · Last refresh ${searchConsole.lastSyncAt.toLocaleString()}`
            : ""}
        </p>
      ) : null}

      {explanation ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{explanation.headline}</p>
          {explanation.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {latest && latest.topQueries.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Top queries</p>
          {latest.topQueries.slice(0, 8).map((row) => (
            <p key={row.key} className="text-sm text-muted-foreground">
              {row.key} · {row.clicks} clicks · {row.impressions} impressions
            </p>
          ))}
        </div>
      ) : null}

      {latest && latest.topPages.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Top pages</p>
          {latest.topPages.slice(0, 8).map((row) => (
            <p key={row.key} className="text-sm text-muted-foreground">
              {row.key} · {row.clicks} clicks · {row.impressions} impressions
            </p>
          ))}
        </div>
      ) : null}

      {searchConsole.connected ? (
        <div className="flex flex-wrap gap-2">
          <SaveForm
            action={syncSearchConsole}
            successMessage="Search Console numbers saved."
          >
            <SaveButton pendingLabel="Refreshing…" disabled={!canManage}>
              Refresh Search Console
            </SaveButton>
          </SaveForm>
          <SaveForm
            action={disconnectSearchConsole}
            successMessage="Search Console disconnected."
          >
            <SaveButton variant="outline" disabled={!canManage}>
              Disconnect
            </SaveButton>
          </SaveForm>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Search Console</CardTitle>
        <CardDescription>
          Read-only. GroovGro will not edit the site, submit a sitemap, or buy
          ads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}

export function searchConsoleNotice(
  gsc: string | undefined,
  error: string | undefined,
): string | null {
  if (error) return error;
  if (gsc === "connected") {
    return "Search Console connected. GroovGro only reads the numbers.";
  }
  if (gsc === "pick") {
    return "Google is connected. Choose the property that matches the connected website.";
  }
  if (gsc === "missing") {
    return "Google is connected, but no Search Console property matched the connected website.";
  }
  return null;
}
