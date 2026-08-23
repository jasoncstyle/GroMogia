import Link from "next/link";

import { GrowthReviewCard } from "@/components/growth-review";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { hasPermission } from "@/lib/permissions";

export default async function GrowthReviewPage() {
  const session = await getAppSession();
  const snapshot = session.organizationId
    ? await getGrowthSnapshot(session.organizationId)
    : null;
  const canSave =
    Boolean(session.organizationId) &&
    hasPermission(session.permissions, "view_decision_history");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Growth review</h1>
        <p className="text-muted-foreground">
          A weekly look at progress, and a monthly look at whether the plan is
          still right. &quot;No change yet&quot; is a successful review.
          GroovGro does not run ads, send email, or change the website from
          this page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>When to look</CardTitle>
          <CardDescription>
            The schedule is for you. It does not force GroovGro to change the
            business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            {snapshot?.weeklyReview.nextScheduledLabel ??
              "Sign in to see the review schedule for this organization."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/app/goals">Change the schedule</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/decisions">Open Decision History</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/intelligence">Open specialists</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {snapshot ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <GrowthReviewCard review={snapshot.weeklyReview} canSave={canSave} />
          <GrowthReviewCard review={snapshot.monthlyReview} canSave={canSave} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sign in to generate a weekly and monthly review from connected data.
        </p>
      )}
    </div>
  );
}
