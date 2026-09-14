import { decideScoutProposal, saveScoutProposalPack } from "@/lib/actions/scout-proposals";
import {
  SCOUT_STATUS_APPROVED,
  SCOUT_STATUS_PROPOSED,
  type ScoutGscExport,
  type ScoutKeywordExport,
  type ScoutPublicPage,
} from "@/lib/growth/scout-proposals";
import type { ScoutProposalRow } from "@/lib/growth/scout-proposal-query";
import { CopyText } from "@/components/copy-text";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ScoutProposalPanel({
  heading,
  items,
  gscExport,
  publicPages = [],
  keywords = null,
  handoffUrl,
  canManage = false,
}: {
  heading: string
  items: ScoutProposalRow[]
  gscExport: ScoutGscExport | null
  publicPages?: ScoutPublicPage[]
  keywords?: ScoutKeywordExport | null
  handoffUrl: string
  canManage?: boolean
}) {
  const exportText =
    gscExport || publicPages.length > 0 || (keywords?.keywords.length ?? 0) > 0
      ? JSON.stringify({ gsc: gscExport, publicPages, keywords }, null, 2)
      : "";
  const open = items.filter(
    (item) =>
      item.status === SCOUT_STATUS_PROPOSED || item.status === SCOUT_STATUS_APPROVED,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        <CardDescription>
          Monday review: approve or reject what SEOgro wrote into GroovGro.
          GroovGro talks to SEOgro. You mark what ships. You are not the
          courier. SEOgro does not log into Google or apply. GroovGro is the
          applicator. Live site write stays off until that door is opened.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">SEOgro handoff: {handoffUrl}</p>
          <CopyText text={handoffUrl} label="Copy SEOgro handoff URL" />
        </div>
        <p className="text-sm text-muted-foreground">
          SEOgro uses the desk token: GET this URL to read stored Search
          Console, keyword history, and public URL inventory, then POST the
          proposal pack back.
          One property per pack. Do not give SEOgro a Google login.
        </p>
        {exportText ? (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">
              Sample payload (same contract as the handoff)
            </summary>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CopyText text={exportText} label="Copy stored Search Console sample" />
            </div>
          </details>
        ) : (
          <p className="text-sm text-muted-foreground">
            Refresh Search Console so GroovGro has a stored snapshot for SEOgro.
          </p>
        )}

        {canManage ? (
          <SaveForm
            action={saveScoutProposalPack}
            successMessage="Proposal pack saved. Nothing was applied."
            resetOnSuccess
            className="space-y-2"
          >
            <label className="block text-sm font-medium" htmlFor="scout-pack">
              Fallback: paste a sample pack
            </label>
            <textarea
              id="scout-pack"
              name="pack"
              rows={8}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder='{"property":"your-site","source":"gsc","items":[]}'
            />
            <SaveButton type="submit" size="sm">
              Save proposal pack
            </SaveButton>
          </SaveForm>
        ) : null}

        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No SEOgro proposals waiting. Stay quiet when nothing is worth doing.
          </p>
        ) : (
          <ul className="space-y-3">
            {open.map((item) => (
              <li key={item.id} className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {item.property} · {item.type.replace(/_/g, " ")} ·{" "}
                  {item.status}
                </p>
                <p className="text-sm text-muted-foreground">{item.evidence}</p>
                {item.expectedEffect ? (
                  <p className="text-sm text-muted-foreground">
                    Expected: {item.expectedEffect}
                  </p>
                ) : null}
                {item.draft ? (
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                    {item.draft}
                  </pre>
                ) : null}
                {canManage && item.status === SCOUT_STATUS_PROPOSED ? (
                  <div className="flex flex-wrap gap-2">
                    <SaveForm
                      action={decideScoutProposal}
                      successMessage="Proposal approved."
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="action" value="approve" />
                      <SaveButton type="submit" size="sm">
                        Approve
                      </SaveButton>
                    </SaveForm>
                    <SaveForm
                      action={decideScoutProposal}
                      successMessage="Proposal rejected."
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="action" value="reject" />
                      <SaveButton type="submit" size="sm" variant="outline">
                        Reject
                      </SaveButton>
                    </SaveForm>
                  </div>
                ) : null}
                {canManage && item.status === SCOUT_STATUS_APPROVED ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {item.draft ? (
                      <CopyText text={item.draft} label="Copy draft to apply" />
                    ) : null}
                    <SaveForm
                      action={decideScoutProposal}
                      successMessage="Recorded as shipped."
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="action" value="ship" />
                      <SaveButton type="submit" size="sm">
                        I applied this
                      </SaveButton>
                    </SaveForm>
                    <p className="text-xs text-muted-foreground">
                      GroovGro records shipped after you apply it. It does not
                      patch the live site.
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
