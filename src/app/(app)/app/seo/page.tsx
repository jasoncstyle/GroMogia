import Link from "next/link";

import { createSeoDrafts, decideSeoDraft, runSeoAudit } from "@/lib/actions/seo";
import { getAppSession } from "@/lib/auth/session";
import { getSeoPageData } from "@/lib/phase6/queries";
import { CopyText } from "@/components/copy-text";
import { FoldableSample } from "@/components/foldable-sample";
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

export default async function SeoPage() {
  const session = await getAppSession();
  const data = session.organizationId
    ? await getSeoPageData(session.organizationId)
    : null;
  const latest = data?.audits[0] ?? null;
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
          Check the connected homepage, then draft improvements for you to
          approve. GroovGro will not buy ads or change Stripe checkout.
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

          {latest ? (
            <Card>
              <CardHeader>
                <CardTitle>Latest score: {latest.score}</CardTitle>
                <CardDescription>
                  {latest.createdAt.toLocaleString()} · {latest.url}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{latest.summary}</p>
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
          ) : (
            <p className="text-sm text-muted-foreground">
              Run a check to see titles, descriptions, headings, robots.txt, and
              sitemap on the connected homepage.
            </p>
          )}

          {openDrafts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Approve or do not approve</CardTitle>
                <CardDescription>
                  Open each item for the exact text and where to put it.
                  Approval keeps the draft in GroovGro. It does not publish
                  unless a later official connection can apply it for you.
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
                      <CopyText text={draft.proposedChange} label="Copy draft" />
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
