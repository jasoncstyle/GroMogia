import Link from "next/link";
import { eq } from "drizzle-orm";

import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { websiteDiscoveredPages, websites } from "@/lib/db/schema";
import { missingFoundationServices } from "@/lib/env";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import {
  buildStatusAlerts,
  websiteWasRead,
} from "@/lib/growth/status-alerts";
import { draftToggleTitle } from "@/lib/growth/types";
import { BusinessBrainForm } from "@/components/business-brain-form";
import { FoldableSample } from "@/components/foldable-sample";
import { StatusAlertList } from "@/components/status-alert";
import {
  InferredGoalDraft,
  InferredOfferDraft,
  ReviewConnectedDataButton,
} from "@/components/growth-review";
import { WebsitePageChecklist } from "@/components/website-page-checklist";
import { OpenNextStepLink } from "@/components/open-next-step-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function BusinessBrainPage() {
  const session = await getAppSession();
  const db = getDb();
  const [snapshot, websiteRows, discoveredRows] = await Promise.all([
    session.organizationId
      ? getGrowthSnapshot(session.organizationId)
      : Promise.resolve(null),
    db && session.organizationId
      ? db
          .select({ publicUrl: websites.publicUrl })
          .from(websites)
          .where(eq(websites.organizationId, session.organizationId))
          .limit(1)
      : Promise.resolve([]),
    db && session.organizationId
      ? db
          .select()
          .from(websiteDiscoveredPages)
          .where(eq(websiteDiscoveredPages.organizationId, session.organizationId))
      : Promise.resolve([]),
  ]);
  const brain = snapshot?.brain;
  const brand = snapshot?.brand;
  const statusAlerts = buildStatusAlerts({
    signedIn: Boolean(session.email),
    organizationReady: Boolean(session.organizationId),
    missingServices: missingFoundationServices(),
    websiteUrl: websiteRows[0]?.publicUrl ?? "",
    websiteRead: websiteWasRead(brain?.inferredSummary),
    stripeConnected: false,
    paymentCount: 0,
    recordedVisitCount: 0,
    topics: ["workspace", "website"],
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business</h1>
        <p className="text-muted-foreground">
          This is the Business Brain: a structured picture of the organization.
          Later modules read from here. It is not an AI prompt and it is not
          tied to one industry.
        </p>
      </div>

      <StatusAlertList alerts={statusAlerts} />

      <Card>
        <CardHeader>
          <CardTitle>Review connected data</CardTitle>
          <CardDescription>
            Saving a website address is not enough. Find pages, check the
            important ones, then click Review connected data so GroovGro can
            read events, bookings, payments, and those checked pages. Drafts
            stay inactive until you confirm. It will not guess an industry,
            change the website, or start marketing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {websiteRows[0]?.publicUrl ? (
            <WebsitePageChecklist
              pages={discoveredRows}
              disabled={!session.organizationId}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Save a website address on Website first. Then you can find pages
              here.
            </p>
          )}
          {brain?.inferredSummary ? (
            <p className="text-sm text-muted-foreground">{brain.inferredSummary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No review yet. Check the pages GroovGro should read, then click
              the button. Connecting the address does not do that by itself.
            </p>
          )}
          <ReviewConnectedDataButton disabled={!session.organizationId} />
          {(snapshot?.inferredOffers.length ?? 0) > 0 ? (
            <FoldableSample
              title={draftToggleTitle("offer", snapshot?.inferredOffers.length ?? 0)}
              subtitle="Open the list, then open each name to read it. Drafts stay inactive."
            >
              {snapshot?.inferredOffers.map((offer) => (
                <InferredOfferDraft key={offer.id} offer={offer} />
              ))}
            </FoldableSample>
          ) : null}
          {(snapshot?.inferredGoals.length ?? 0) > 0 ? (
            <FoldableSample
              title={draftToggleTitle("goal", snapshot?.inferredGoals.length ?? 0)}
              subtitle="Open the list, then open each name to read it. Drafts stay inactive."
            >
              {snapshot?.inferredGoals.map((goal) => (
                <InferredGoalDraft key={goal.id} goal={goal} />
              ))}
            </FoldableSample>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identity already in Brand</CardTitle>
          <CardDescription>
            Name, what the business does, and who it serves stay on Brand so
            there is one source of truth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Name: </span>
            {brand?.businessName || session.organizationName || "Not set"}
          </p>
          <p className="text-muted-foreground">
            {brand?.description || "Add a description on the Brand page."}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/settings/brand">Edit brand</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How this business works</CardTitle>
          <CardDescription>
            Use the business&apos;s own words. GroovGro will not assume seats,
            rooms, tickets, or other industry-specific shapes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessBrainForm
            brain={brain}
            disabled={!session.organizationId}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Offers"
          value={String(snapshot?.offers.length ?? 0)}
          href="/app/offers"
        />
        <Stat
          label="Constraints"
          value={String(snapshot?.constraints.length ?? 0)}
          href="/app/offers"
        />
        <Stat
          label="Active goals"
          value={String(snapshot?.activeGoals.length ?? 0)}
          href="/app/goals"
        />
      </div>

      <OpenNextStepLink />
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
        <Button asChild variant="link" className="h-auto px-0">
          <Link href={href}>Open</Link>
        </Button>
      </CardHeader>
    </Card>
  );
}
