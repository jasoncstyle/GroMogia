import Link from "next/link";

import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import { refreshIntelligence } from "@/lib/actions/intelligence";
import { SpecialistReports } from "@/components/specialist-reports";
import { getSpecialistReports } from "@/lib/growth/queries";
import { hasPermission } from "@/lib/permissions";
import {
  getIntelligencePageData,
  parseStoredBrief,
} from "@/lib/phase4/queries";
import { isAiGatewayConfigured } from "@/lib/intelligence/polish";

export default async function IntelligencePage() {
  const session = await getAppSession();
  const showFinancials = hasPermission(session.permissions, "view_financials");
  const data = session.organizationId
    ? await getIntelligencePageData(session.organizationId, { showFinancials })
    : null;
  const specialists = session.organizationId
    ? await getSpecialistReports(session.organizationId)
    : [];
  const canSaveDecision = hasPermission(session.permissions, "view_decision_history");
  const latest = data?.logs[0];
  const stored = latest ? parseStoredBrief(latest.output) : null;
  const storedNarrative = latest ? readNarrative(latest.output) : null;
  const usedAi = latest ? readUsedAi(latest.output) : false;
  const gatewayReady = isAiGatewayConfigured();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Intelligence</h1>
        <p className="text-muted-foreground">
          Observe and recommend only, now including specialists linked to
          Goals. GroovGro will not send email, change ads, edit a website, or
          take a payment. Live checkout stays on the existing Stripe
          destination.
        </p>
      </div>

      {!data ? (
        <p className="text-sm text-muted-foreground">
          Sign in to see intelligence for this organization.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{data.brief.headline}</CardTitle>
              <CardDescription>
                Built from this workspace’s website visits, leads, customers,
                and Stripe <code className="text-foreground">ch_</code> charges.
                {gatewayReady
                  ? " Refresh can also rewrite the wording in plain language."
                  : " Refresh saves this briefing. Add AI Gateway later if you want the wording rewritten."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SaveForm
                action={refreshIntelligence}
                successMessage="Insight saved."
              >
                <SaveButton pendingLabel="Refreshing…">
                  Save this insight
                </SaveButton>
              </SaveForm>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observations</CardTitle>
                <CardDescription>What the connected data shows.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.brief.observations.map((item) => (
                  <InsightBlock key={item.title} {...item} />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommended next steps</CardTitle>
                <CardDescription>
                  You do these. GroovGro will not run them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.brief.recommendations.map((item) => (
                  <InsightBlock key={item.title} {...item} />
                ))}
              </CardContent>
            </Card>
          </div>

          {specialists.length > 0 ? (
            <SpecialistReports reports={specialists} canSave={canSaveDecision} />
          ) : null}

          {storedNarrative ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Last saved insight</CardTitle>
                <CardDescription>
                  {latest
                    ? latest.createdAt.toLocaleString()
                    : null}
                  {usedAi ? " · plain-language rewrite" : " · from connected data"}
                  {stored?.headline ? ` · ${stored.headline}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {storedNarrative}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function InsightBlock({
  title,
  body,
  evidence,
  href,
}: {
  title: string
  body: string
  evidence: string[]
  href?: string
}) {
  return (
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
      <p className="text-xs text-muted-foreground">
        Evidence: {evidence.join(", ")}
      </p>
      {href ? (
        <Button asChild variant="link" className="h-auto px-0">
          <Link href={href}>Open related page</Link>
        </Button>
      ) : null}
    </div>
  );
}

function readNarrative(output: string): string | null {
  try {
    const parsed = JSON.parse(output) as { narrative?: string };
    return parsed.narrative ?? null;
  } catch {
    return output || null;
  }
}

function readUsedAi(output: string): boolean {
  try {
    const parsed = JSON.parse(output) as { usedAi?: boolean };
    return Boolean(parsed.usedAi);
  } catch {
    return false;
  }
}
