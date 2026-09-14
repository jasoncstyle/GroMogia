import Link from "next/link";

import {
  disconnectGa4,
  selectGa4Property,
  syncGa4,
} from "@/lib/actions/ga4";
import { explainGa4 } from "@/lib/ga4/analytics";
import type { getGa4PageData } from "@/lib/ga4/query";
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
import { TaskScheduleForm } from "@/components/task-schedule-form";

type Ga4State = Awaited<ReturnType<typeof getGa4PageData>>;

export function Ga4Panel({
  analytics,
  notice,
  canManage = true,
}: {
  analytics: Ga4State
  notice: string | null
  canManage?: boolean
}) {
  const latest = analytics.snapshots[0] ?? null;
  const explanation = latest
    ? explainGa4({
        propertyId: latest.propertyId,
        propertyName: latest.propertyName,
        startDate: latest.startDate,
        endDate: latest.endDate,
        totals: latest.totals,
        topPages: latest.topPages,
        topSources: latest.topSources,
      })
    : null;

  return (
    <Card id="google-analytics">
      <CardHeader>
        <CardTitle>Google Analytics</CardTitle>
        <CardDescription>
          Read-only GA4 snapshot. GroovGro stores sessions, landing pages, and
          sources. It does not change the website or buy ads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

        {!analytics.configured ? (
          <p className="text-sm text-muted-foreground">
            Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then
            redeploy. Click-by-click steps are in docs/phase-6/USER_SETUP.md.
          </p>
        ) : null}

        {analytics.configured && !analytics.connected ? (
          canManage ? (
            <Button asChild>
              <Link href="/api/google-analytics/start">Connect Google Analytics</Link>
            </Button>
          ) : (
            <Button disabled>Connect Google Analytics</Button>
          )
        ) : null}

        {analytics.connected &&
        !analytics.propertyId &&
        (analytics.candidates?.length ?? 0) > 0 ? (
          <SaveForm
            action={selectGa4Property}
            successMessage="Analytics property saved."
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="propertyId">GA4 property</Label>
              <select
                id="propertyId"
                name="propertyId"
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Choose a property
                </option>
                {(analytics.candidates ?? []).map((property) => (
                  <option key={property.propertyId} value={property.propertyId}>
                    {property.displayName}
                    {property.accountName ? ` · ${property.accountName}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {canManage ? (
              <SaveButton type="submit">Save property</SaveButton>
            ) : null}
          </SaveForm>
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
        ) : analytics.connected && analytics.propertyId ? (
          <p className="text-sm text-muted-foreground">
            No Analytics snapshot stored yet. Refresh to pull the last 28 days.
          </p>
        ) : null}

        {analytics.lastError ? (
          <p className="text-sm text-muted-foreground">{analytics.lastError}</p>
        ) : null}

        {analytics.connected && canManage ? (
          <div className="flex flex-wrap gap-2">
            <SaveForm action={syncGa4} successMessage="Analytics numbers saved.">
              <SaveButton type="submit" variant="outline">
                Refresh Analytics
              </SaveButton>
            </SaveForm>
            <SaveForm action={disconnectGa4} successMessage="Google Analytics disconnected.">
              <SaveButton type="submit" variant="outline">
                Disconnect
              </SaveButton>
            </SaveForm>
          </div>
        ) : null}
        {analytics.connected ? (
          <TaskScheduleForm taskKey="ga4.refresh" canManage={canManage} />
        ) : null}
      </CardContent>
    </Card>
  );
}
