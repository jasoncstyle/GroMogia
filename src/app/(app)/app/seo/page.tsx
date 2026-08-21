import Link from "next/link";

import { createSeoDrafts, decideSeoDraft, runSeoAudit } from "@/lib/actions/seo";
import { applySeoDraftToBuilder } from "@/lib/actions/website-builder";
import { getAppSession } from "@/lib/auth/session";
import { getSeoPageData } from "@/lib/phase6/queries";
import { explainSeoCheck } from "@/lib/seo/explain";
import { compareSeoChecks, scoreTrendLabel } from "@/lib/seo/monitor";
import { isBuilderApplyableFinding } from "@/lib/website-builder/apply-seo";
import { CopyText } from "@/components/copy-text";
import { FoldableSample } from "@/components/foldable-sample";
import { SearchConsolePanel, searchConsoleNotice } from "@/components/search-console-panel";
import { SaveButton, SaveForm } from "@/components/save-form";
import { WebsiteUpdateExpectation } from "@/components/website-update-expectation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<{ gsc?: string; error?: string }>
}) {
  const params = await searchParams;
  const session = await getAppSession();
  const data = session.organizationId
    ? await getSeoPageData(session.organizationId)
    : null;
  const latest = data?.audits[0] ?? null;
  const previous = data?.audits[1] ?? null;
  const comparison = latest
    ? compareSeoChecks(
        { score: latest.score, findings: latest.findings },
        previous
          ? { score: previous.score, findings: previous.findings }
          : null,
      )
    : null;
  const explanation =
    latest && comparison
      ? explainSeoCheck({
          score: latest.score,
          findings: latest.findings,
          comparison,
        })
      : null;
  const openDrafts = data?.drafts.filter((draft) => draft.status === "draft") ?? [];
  const decidedDrafts =
    data?.drafts.filter((draft) => draft.status !== "draft").slice(0, 8) ?? [];
  const needsDrafts =
    Boolean(latest?.findings.some((finding) => finding.severity !== "ok"));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SEO</h1>
        <p className="text-muted-foreground">
          Check the connected homepage, see how the score changes over time,
          then draft improvements for you to approve. Search Console is
          read-only. GroovGro will not buy ads or change Stripe checkout.
        </p>
      </div>

      <WebsiteUpdateExpectation />

      {!data || !session.organizationId ? (
        <p className="text-sm text-muted-foreground">
          Sign in to check the connected website.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Connected homepage</CardTitle>
              <CardDescription>
                {data.website?.publicUrl
                  ? data.website.publicUrl
                  : "No website is connected yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {data.website?.publicUrl ? (
                <>
                  <SaveForm action={runSeoAudit} successMessage="Check saved.">
                    <SaveButton pendingLabel="Checking…">Run homepage check</SaveButton>
                  </SaveForm>
                  {needsDrafts ? (
                    <SaveForm
                      action={createSeoDrafts}
                      successMessage="Drafts ready to approve."
                    >
                      <SaveButton pendingLabel="Drafting…" variant="outline">
                        Draft improvements
                      </SaveButton>
                    </SaveForm>
                  ) : null}
                </>
              ) : (
                <Button asChild>
                  <Link href="/app/website">Connect website</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <SearchConsolePanel
            searchConsole={data.searchConsole}
            notice={searchConsoleNotice(params.gsc, params.error)}
          />

          {data.hasBuilderSite ? (
            <Card>
              <CardHeader>
                <CardTitle>GroovGro website</CardTitle>
                <CardDescription>
                  After you approve a title, description, or heading draft, click
                  Apply to GroovGro website. That updates the GroovGro-hosted
                  page only. It does not change the connected existing website.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {latest && explanation ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>What this means</CardTitle>
                  <CardDescription>
                    {explanation.headline} · {latest.createdAt.toLocaleString()}{" "}
                    · {latest.url}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {explanation.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Latest check details</CardTitle>
                  <CardDescription>
                    Score {latest.score}. Open a row for the technical detail.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latest.findings.map((finding) => (
                    <FoldableSample
                      key={finding.id}
                      title={finding.title}
                      subtitle={severityLabel(finding.severity)}
                    >
                      <p className="text-sm text-muted-foreground">{finding.detail}</p>
                      <p className="text-sm">{finding.recommendation}</p>
                    </FoldableSample>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run a check to see titles, descriptions, headings, robots.txt, and
              sitemap on the connected homepage.
            </p>
          )}

          {data.audits.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Checks over time</CardTitle>
                <CardDescription>
                  Technical monitoring from saved homepage checks. GroovGro does
                  not use Search Console yet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.audits.map((audit, index) => {
                  const older = data.audits[index + 1];
                  const change = older ? audit.score - older.score : null;
                  return (
                    <p key={audit.id} className="text-sm">
                      <span className="font-medium">{audit.score}</span>
                      {" · "}
                      {audit.createdAt.toLocaleString()}
                      {" · "}
                      <span className="text-muted-foreground">
                        {scoreTrendLabel(change)}
                      </span>
                    </p>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          {openDrafts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Approve or do not approve</CardTitle>
                <CardDescription>
                  Open each item for the exact text and where to put it.
                  Approval keeps the draft in GroovGro. Title, description, and
                  heading drafts can later be applied to a GroovGro website.
                  Connected custom sites still need a manual paste.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {openDrafts.map((draft) => (
                  <FoldableSample
                    key={draft.id}
                    title={draft.title}
                    subtitle="Waiting for your decision"
                  >
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                      {draft.proposedChange}
                    </pre>
                    <p className="text-sm text-muted-foreground">{draft.howToApply}</p>
                    <div className="flex flex-wrap gap-2">
                      <CopyText text={draft.proposedChange} label="Copy draft" />
                      <SaveForm action={decideSeoDraft} successMessage="Approved.">
                        <input type="hidden" name="draftId" value={draft.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <SaveButton size="sm">Approve</SaveButton>
                      </SaveForm>
                      <SaveForm
                        action={decideSeoDraft}
                        successMessage="Marked as do not approve."
                      >
                        <input type="hidden" name="draftId" value={draft.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <SaveButton size="sm" variant="outline">
                          Do not approve
                        </SaveButton>
                      </SaveForm>
                    </div>
                  </FoldableSample>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {decidedDrafts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Earlier decisions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {decidedDrafts.map((draft) => (
                  <FoldableSample
                    key={draft.id}
                    title={draft.title}
                    subtitle={draft.status === "approved" ? "Approved" : "Not approved"}
                  >
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                      {draft.proposedChange}
                    </pre>
                    {draft.status === "approved" ? (
                      <div className="flex flex-wrap gap-2">
                        <CopyText text={draft.proposedChange} label="Copy draft" />
                        {data.hasBuilderSite && isBuilderApplyableFinding(draft.findingId) ? (
                          <SaveForm
                            action={applySeoDraftToBuilder}
                            successMessage="Applied to the GroovGro website."
                          >
                            <input type="hidden" name="draftId" value={draft.id} />
                            <SaveButton size="sm">Apply to GroovGro website</SaveButton>
                          </SaveForm>
                        ) : null}
                      </div>
                    ) : null}
                  </FoldableSample>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function severityLabel(severity: "ok" | "warn" | "fail") {
  if (severity === "fail") return "Needs a fix";
  if (severity === "warn") return "Could be clearer";
  return "Looks good";
}
