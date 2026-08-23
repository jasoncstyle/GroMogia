import Link from "next/link";
import { eq } from "drizzle-orm";

import { updateBusinessBrain } from "@/lib/actions/growth";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { missingFoundationServices } from "@/lib/env";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import {
  buildStatusAlerts,
  websiteWasRead,
} from "@/lib/growth/status-alerts";
import { commaTextFromList, draftToggleTitle } from "@/lib/growth/types";
import { FoldableSample } from "@/components/foldable-sample";
import { StatusAlertList } from "@/components/status-alert";
import {
  InferredGoalDraft,
  InferredOfferDraft,
  ReviewConnectedDataButton,
} from "@/components/growth-review";
import { SaveButton, SaveForm } from "@/components/save-form";
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
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export default async function BusinessBrainPage() {
  const session = await getAppSession();
  const db = getDb();
  const [snapshot, websiteRows] = await Promise.all([
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
            Saving a website address is not enough. Click the button below so
            GroovGro can read events, bookings, payments, and pages on the
            connected website. Drafts stay inactive until you confirm. It will
            not guess an industry, change the website, or start marketing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {brain?.inferredSummary ? (
            <p className="text-sm text-muted-foreground">{brain.inferredSummary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No review yet. If a website is connected, click the button so
              GroovGro can read the pages. Connecting the address does not do
              that by itself.
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
          <SaveForm
            action={updateBusinessBrain}
            successMessage="Business saved"
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                name="industry"
                defaultValue={brain?.industry ?? ""}
                placeholder="What kind of business is this?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessModel">Business model</Label>
              <Input
                id="businessModel"
                name="businessModel"
                defaultValue={brain?.businessModel ?? ""}
                placeholder="How it makes money or creates value"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="locations">Locations</Label>
              <Input
                id="locations"
                name="locations"
                defaultValue={commaTextFromList(brain?.locations)}
                placeholder="Separate with commas"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="serviceAreas">Service areas</Label>
              <Input
                id="serviceAreas"
                name="serviceAreas"
                defaultValue={commaTextFromList(brain?.serviceAreas)}
                placeholder="Where customers come from"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="operatingHours">Operating hours</Label>
              <Textarea
                id="operatingHours"
                name="operatingHours"
                rows={3}
                defaultValue={brain?.operatingHours ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seasonality">Seasonality</Label>
              <Input
                id="seasonality"
                name="seasonality"
                defaultValue={brain?.seasonality ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discoveryStatus">How sure is this?</Label>
              <select
                id="discoveryStatus"
                name="discoveryStatus"
                className={selectClassName}
                defaultValue={brain?.discoveryStatus ?? "not_started"}
              >
                <option value="not_started">Not started</option>
                <option value="inferred">Inferred — still confirm</option>
                <option value="confirmed">Confirmed by the owner</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes and constraints</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={brain?.notes ?? ""}
                placeholder="Budget, staffing, compliance, or anything GroovGro should not ignore"
              />
            </div>
            <SaveButton type="submit" disabled={!session.organizationId}>
              Save business
            </SaveButton>
          </SaveForm>
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
