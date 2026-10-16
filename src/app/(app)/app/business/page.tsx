import Link from "next/link";
import { eq } from "drizzle-orm";

import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { websites } from "@/lib/db/schema";
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
import { OpenNextStepLink } from "@/components/open-next-step-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BUSINESS_SECTIONS,
  parseBusinessSection,
} from "@/lib/owner-surface/boards";
import { cn } from "@/lib/utils";

export default async function BusinessBrainPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const params = await searchParams;
  const section = parseBusinessSection(params.section);
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
          tied to one industry. This is what GroovGro already knows — not a new
          Fact system.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {BUSINESS_SECTIONS.map((item) => (
          <Link
            key={item.id}
            href={item.id === "about" ? "/app/business" : `/app/business?section=${item.id}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              section === item.id
                ? "border-foreground bg-foreground text-background"
                : "bg-card",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <StatusAlertList alerts={statusAlerts} />

      {section === "products" ? (
        <Card>
          <CardHeader>
            <CardTitle>Products & services</CardTitle>
            <CardDescription>
              What this business already sells. GroovGro does not invent an offer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(snapshot?.offers ?? []).length === 0 ? (
              <p className="text-muted-foreground">No offers saved yet. Add one on Offers.</p>
            ) : (
              snapshot?.offers.map((offer) => (
                <p key={offer.id}>
                  <span className="font-medium">{offer.name}</span>
                  {offer.description ? ` — ${offer.description}` : ""}
                </p>
              ))
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/app/offers">Open Offers</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {section === "audience" ? (
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            <CardDescription>
              Who to reach, in the owner&apos;s words. GroovGro does not fetch this list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(brain?.idealCustomers ?? []).length > 0 ? (
              (brain?.idealCustomers ?? []).map((item) => <p key={item}>{item}</p>)
            ) : (
              <p className="text-muted-foreground">No audience notes yet. Add them below in About.</p>
            )}
            {(brain?.painPoints ?? []).length > 0 ? (
              <div className="pt-2">
                <p className="font-medium">Problems they bring</p>
                {(brain?.painPoints ?? []).map((item) => (
                  <p key={item} className="text-muted-foreground">{item}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {section === "brand" ? (
        <Card>
          <CardHeader>
            <CardTitle>Brand</CardTitle>
            <CardDescription>
              How this business sounds. Drafts stay here until you use them yourself.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{brand?.businessName || session.organizationName || "Not set"}</p>
            <p className="text-muted-foreground">{brand?.description || "No brand description yet."}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/app/settings/brand">Edit brand</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/app/brand-voice">Open Brand voice</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {section === "goals" ? (
        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
            <CardDescription>
              Measurable outcomes already saved for this business.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(snapshot?.activeGoals ?? []).length === 0 ? (
              <p className="text-muted-foreground">No active Goal yet. Open Next step to add one.</p>
            ) : (
              snapshot?.activeGoals.map((goal) => (
                <p key={goal.id}>
                  <span className="font-medium">{goal.title}</span>
                  {goal.progressPercent != null ? ` · ${goal.progressPercent}%` : ""}
                </p>
              ))
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/app/next-step">Open Next step</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {section === "rules" ? (
        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
            <CardDescription>
              Claims to avoid and other constraints the owner already wrote.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(brain?.prohibitedClaims ?? []).length > 0 ? (
              (brain?.prohibitedClaims ?? []).map((item) => <p key={item}>{item}</p>)
            ) : (
              <p className="text-muted-foreground">No prohibited claims saved yet.</p>
            )}
            {(brain?.differentiators ?? []).length > 0 ? (
              <div className="pt-2">
                <p className="font-medium">What makes this business different</p>
                {(brain?.differentiators ?? []).map((item) => (
                  <p key={item} className="text-muted-foreground">{item}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {section === "knows" ? (
        <Card>
          <CardHeader>
            <CardTitle>What GroovGro knows</CardTitle>
            <CardDescription>
              A plain-English look at the saved Brain. This is not a Stage 2 Fact model.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{brain?.inferredSummary || "GroovGro has not read connected pages yet."}</p>
            <p className="text-muted-foreground">
              {brain?.businessModel || "No business model note yet."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {section === "learned" ? (
        <Card>
          <CardHeader>
            <CardTitle>What GroovGro learned</CardTitle>
            <CardDescription>
              Saved decisions and outcomes. GroovGro does not invent a win from this list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(snapshot?.decisions ?? []).slice(0, 6).map((decision) => (
              <p key={decision.id}>
                <span className="font-medium">{decision.recommendation}</span>
                {decision.outcome ? ` — ${decision.outcome}` : ""}
              </p>
            ))}
            {(snapshot?.decisions.length ?? 0) === 0 ? (
              <p className="text-muted-foreground">Nothing learned yet.</p>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href="/app/decisions">Open decision history</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {section === "about" ? (
        <>


      <Card>
        <CardHeader>
          <CardTitle>Review connected data</CardTitle>
          <CardDescription>
            Saving a website address is not enough. Find pages and check the
            important ones on Next step, then click Review connected data so
            GroovGro can read events, bookings, payments, and those checked
            pages. Confirm or reject suggested drafts on Next step. It will
            not guess an industry, change the website, or start marketing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {websiteRows[0]?.publicUrl ? (
            <p className="text-sm text-muted-foreground">
              Find pages and check the important ones on Next step, then
              review here. GroovGro will not change the live site.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Save a website address on Next step first. Then find pages
              there.
            </p>
          )}
          {brain?.inferredSummary ? (
            <p className="text-sm text-muted-foreground">{brain.inferredSummary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No review yet. Find pages on Next step, then click the button
              here. Connecting the address does not do that by itself.
            </p>
          )}
          <ReviewConnectedDataButton disabled={!session.organizationId} />
          {(snapshot?.inferredOffers.length ?? 0) > 0 ? (
            <FoldableSample
              title={draftToggleTitle("offer", snapshot?.inferredOffers.length ?? 0)}
              subtitle="Open the list, then open each name to read it. Confirm or reject on Next step."
            >
              {snapshot?.inferredOffers.map((offer) => (
                <InferredOfferDraft key={offer.id} offer={offer} />
              ))}
            </FoldableSample>
          ) : null}
          {(snapshot?.inferredGoals.length ?? 0) > 0 ? (
            <FoldableSample
              title={draftToggleTitle("goal", snapshot?.inferredGoals.length ?? 0)}
              subtitle="Open the list, then open each name to read it. Confirm or reject on Next step."
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
            Use the business&apos;s own words. Add who you want to reach,
            problems, known competitors, differences, and claims to avoid so
            later search and content work has a source of truth. This form still
            does not look up competitors. Save a competitor website on SEO if
            you want GroovGro to read that public page. It will not assume an
            industry shape or edit the live website.
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
          href="/app/next-step"
        />
      </div>
        </>
      ) : null}

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
