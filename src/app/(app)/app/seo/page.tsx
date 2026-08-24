import Link from "next/link";

import {
  createSeoDrafts,
  decideSeoDraft,
  runAllBuilderSeoAudits,
  runBuilderSeoAudit,
  runSeoAudit,
} from "@/lib/actions/seo";
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
import { cn } from "@/lib/utils";

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<{ gsc?: string; error?: string; view?: string }>
}) {
  const params = await searchParams;
  const session = await getAppSession();
  const data = session.organizationId
    ? await getSeoPageData(session.organizationId)
    : null;
  const view = params.view ?? "";
  const selectedPage =
    data?.builderPages.find((page) => page.id === view) ?? null;
  const viewingConnected = view === "connected";
  const hasScopedView = viewingConnected || Boolean(selectedPage);
  const visibleAudits = data
    ? viewingConnected
      ? data.audits.filter((audit) => !audit.builderSiteId)
      : selectedPage
        ? data.audits.filter((audit) => audit.builderSiteId === selectedPage.id)
        : []
    : [];
  const historyAudits = hasScopedView ? visibleAudits : (data?.audits ?? []);
  const latest = visibleAudits[0] ?? null;
  const previous = visibleAudits[1] ?? null;
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
  const openDrafts = draftsForView(
    data?.drafts.filter((draft) => draft.status === "draft") ?? [],
    viewingConnected,
    selectedPage?.id ?? null,
  );
  const decidedDrafts = draftsForView(
    data?.drafts.filter((draft) => draft.status !== "draft") ?? [],
    viewingConnected,
    selectedPage?.id ?? null,
  ).slice(0, 12);
  const needsDrafts = Boolean(latest?.findings.some((finding) => finding.severity !== "ok"));
  const checkLabel = selectedPage
    ? selectedPage.label
    : viewingConnected
      ? "the connected homepage"
      : latest
        ? "the latest check"
        : "a page";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SEO</h1>
        <p className="text-muted-foreground">
          Check the connected website and every GroovGro page. Approve drafts,
          then apply title, description, or heading changes onto that GroovGro
          page. Search Console is read-only. GroovGro will not buy ads or
          change Stripe checkout.
        </p>
      </div>

      <WebsiteUpdateExpectation />

      {!data || !session.organizationId ? (
        <p className="text-sm text-muted-foreground">
          Sign in to check the connected website and GroovGro pages.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Connected homepage</CardTitle>
              <CardDescription>
                {data.website?.publicUrl
                  ? data.website.publicUrl
                  : "No website is connected yet."}{" "}
                This is the existing public site, not the GroovGro builder.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {data.website?.publicUrl ? (
                <>
                  <Button variant={viewingConnected ? "default" : "outline"} asChild>
                    <Link href="/app/seo?view=connected">Show this check</Link>
                  </Button>
                  <SaveForm action={runSeoAudit} successMessage="Check saved.">
                    <SaveButton pendingLabel="Checking…">Run homepage check</SaveButton>
                  </SaveForm>
                  {viewingConnected && needsDrafts ? (
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
                  <Link href="/app/next-step">Connect website</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GroovGro website</CardTitle>
              <CardDescription>
                Home and every extra page. Check one page, or check all. This
                does not change the connected existing website. GroovGro does
                not write robots.txt or sitemap.xml on groovgro.com.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.builderPages.length === 0 ? (
                <div className="flex flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    No GroovGro pages yet.
                  </p>
                  <Button asChild>
                    <Link href="/app/website-builder">Open Website builder</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <SaveForm
                    action={runAllBuilderSeoAudits}
                    successMessage="GroovGro pages checked."
                  >
                    <SaveButton pendingLabel="Checking…">
                      Check all GroovGro pages
                    </SaveButton>
                  </SaveForm>
                  <ul className="space-y-2">
                    {data.builderPages.map((page) => {
                      const selected = selectedPage?.id === page.id;
                      return (
                        <li
                          key={page.id}
                          className={cn(
                            "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2",
                            selected && "border-foreground",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {page.label}
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {page.status === "published" ? "Published" : "Draft"}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {page.lastScore === null
                                ? "No check yet"
                                : `Score ${page.lastScore}`}
                              {page.lastCheckedAt
                                ? ` · ${page.lastCheckedAt.toLocaleString()}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={selected ? "default" : "outline"}
                              asChild
                            >
                              <Link href={`/app/seo?view=${page.id}`}>
                                {selected ? "Showing" : "Show check"}
                              </Link>
                            </Button>
                            <SaveForm
                              action={runBuilderSeoAudit}
                              successMessage="Page checked."
                            >
                              <input type="hidden" name="pageId" value={page.id} />
                              <SaveButton size="sm" variant="outline" pendingLabel="Checking…">
                                Check this page
                              </SaveButton>
                            </SaveForm>
                            {selected && needsDrafts ? (
                              <SaveForm
                                action={createSeoDrafts}
                                successMessage="Drafts ready to approve."
                              >
                                <input type="hidden" name="pageId" value={page.id} />
                                <SaveButton size="sm" variant="outline" pendingLabel="Drafting…">
                                  Draft improvements
                                </SaveButton>
                              </SaveForm>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <SearchConsolePanel
            searchConsole={data.searchConsole}
            notice={searchConsoleNotice(params.gsc, params.error)}
          />

          {latest && explanation ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>What this means</CardTitle>
                  <CardDescription>
                    {explanation.headline} · {checkLabel} ·{" "}
                    {latest.createdAt.toLocaleString()} · {latest.url}
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
              Run a connected homepage check, or check a GroovGro page, to see
              titles, descriptions, and headings.
            </p>
          )}

          {historyAudits.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Checks over time</CardTitle>
                <CardDescription>
                  {selectedPage
                    ? `Saved checks for ${selectedPage.label}.`
                    : viewingConnected
                      ? "Saved checks for the connected homepage."
                      : "Saved checks. Click Show check on a page to see only that page."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {historyAudits.slice(0, 12).map((audit, index) => {
                  const older = historyAudits[index + 1];
                  const change = older ? audit.score - older.score : null;
                  const pageName = audit.builderSiteId
                    ? data.builderPages.find((page) => page.id === audit.builderSiteId)
                        ?.label ?? "GroovGro page"
                    : "Connected website";
                  return (
                    <p key={audit.id} className="text-sm">
                      <span className="font-medium">{audit.score}</span>
                      {" · "}
                      {pageName}
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
                  Open each item for the exact text and where to put it. Title,
                  description, and heading drafts can be applied to the GroovGro
                  page they belong to. Connected custom sites still need a
                  manual paste.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {openDrafts.map((draft) => (
                  <FoldableSample
                    key={draft.id}
                    title={draft.title}
                    subtitle={`Waiting · ${draftTargetLabel(draft.builderSiteId, data.builderPages)}`}
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
                {decidedDrafts.map((draft) => {
                  const pageLabel = draftTargetLabel(
                    draft.builderSiteId,
                    data.builderPages,
                  );
                  return (
                    <FoldableSample
                      key={draft.id}
                      title={draft.title}
                      subtitle={`${draft.status === "approved" ? "Approved" : "Not approved"} · ${pageLabel}`}
                    >
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                        {draft.proposedChange}
                      </pre>
                      {draft.status === "approved" ? (
                        <div className="flex flex-wrap gap-2">
                          <CopyText text={draft.proposedChange} label="Copy draft" />
                          {data.hasBuilderSite &&
                          isBuilderApplyableFinding(draft.findingId) ? (
                            <SaveForm
                              action={applySeoDraftToBuilder}
                              successMessage="Applied to the GroovGro page."
                            >
                              <input type="hidden" name="draftId" value={draft.id} />
                              {draft.builderSiteId ? (
                                <input
                                  type="hidden"
                                  name="pageId"
                                  value={draft.builderSiteId}
                                />
                              ) : null}
                              <SaveButton size="sm">
                                Apply to {draft.builderSiteId ? pageLabel : "Home"}
                              </SaveButton>
                            </SaveForm>
                          ) : null}
                        </div>
                      ) : null}
                    </FoldableSample>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function draftsForView<T extends { builderSiteId: string | null }>(
  drafts: T[],
  viewingConnected: boolean,
  selectedPageId: string | null,
) {
  if (viewingConnected) return drafts.filter((draft) => !draft.builderSiteId);
  if (selectedPageId) {
    return drafts.filter((draft) => draft.builderSiteId === selectedPageId);
  }
  return drafts;
}

function draftTargetLabel(
  builderSiteId: string | null,
  pages: { id: string; label: string }[],
) {
  if (!builderSiteId) return "Connected website";
  return pages.find((page) => page.id === builderSiteId)?.label ?? "GroovGro page";
}

function severityLabel(severity: "ok" | "warn" | "fail") {
  if (severity === "fail") return "Needs a fix";
  if (severity === "warn") return "Could be clearer";
  return "Looks good";
}
