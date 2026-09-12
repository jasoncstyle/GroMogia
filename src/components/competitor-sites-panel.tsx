import { createContentBrief } from "@/lib/actions/content-briefs";
import { createCompeteMove } from "@/lib/actions/compete-moves";
import {
  createCompetitorSite,
  lookAtCompetitorSite,
} from "@/lib/actions/competitor-sites";
import { suggestBriefOutlineFromCompetitorGap } from "@/lib/growth/content-briefs";
import {
  describeCompeteMove,
  suggestCompeteMoveFromGap,
  type CompeteMoveView,
} from "@/lib/growth/compete-moves";
import {
  type CompetitorCompareView,
  type CompetitorPageGapView,
  type CompetitorSearchHint,
  type CompetitorSiteView,
} from "@/lib/growth/competitor-looks";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CompetitorSitesPanel({
  sites,
  searches,
  compare,
  pageGaps = [],
  moves = [],
  pagesRead = false,
  canManage = true,
}: {
  sites: CompetitorSiteView[]
  searches: CompetitorSearchHint[]
  compare?: CompetitorCompareView | null
  pageGaps?: CompetitorPageGapView[]
  moves?: CompeteMoveView[]
  pagesRead?: boolean
  canManage?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How we might compete</CardTitle>
        <CardDescription>
          Save a competitor website you already know, or open a suggested
          search and save a site you found. GroovGro can read that homepage
          and a few public pages on the same site, then compare those looks
          to what you sell. It can name topics those sites show that GroovGro
          has not read on your site. You can save a brief for one of those
          topics. You can save what you will do, including from one of those
          topics. If the site blocks the automated read,
          paste what you see. It will not scrape Google, copy their words
          onto your site, create a page, or buy ads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {compare ? (
          <div className="space-y-1 rounded-lg border p-3">
            <p className="text-sm font-medium">How these sites compare</p>
            <p className="text-sm text-muted-foreground">{compare.note}</p>
          </div>
        ) : null}
        {moves.length > 0 ? (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">What I will do</p>
            {moves.map((move) => (
              <div key={move.id} className="space-y-1">
                <p className="text-sm font-medium">{describeCompeteMove(move)}</p>
                <p className="text-xs text-muted-foreground">
                  {move.createdAt.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        {sites.some((site) => site.competeNote || site.modelGuess) ? (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">
              Pages they show that GroovGro has not read
            </p>
            {!pagesRead ? (
              <p className="text-sm text-muted-foreground">
                Review pages on your website first. GroovGro will not guess
                missing pages or create one.
              </p>
            ) : pageGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The pages GroovGro already read on your site cover the topics
                those competitor sites named. It did not create a page.
              </p>
            ) : (
              pageGaps.map((gap) => {
                const fieldKey = gap.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                const fromGap = suggestCompeteMoveFromGap(gap.label);
                return (
                <div key={gap.label} className="space-y-2">
                  <p className="text-sm font-medium">{gap.label}</p>
                  <p className="text-sm text-muted-foreground">{gap.why}</p>
                  {canManage ? (
                    <SaveForm
                      action={createContentBrief}
                      successMessage="Content brief saved to the planner. GroovGro did not write a page or copy their words."
                    >
                      <input type="hidden" name="query" value={gap.label} />
                      <input type="hidden" name="title" value={gap.label} />
                      <input
                        type="hidden"
                        name="source"
                        value="competitor_gap"
                      />
                      <input
                        type="hidden"
                        name="fromNames"
                        value={gap.fromNames.join(", ")}
                      />
                      <input
                        type="hidden"
                        name="outline"
                        value={suggestBriefOutlineFromCompetitorGap(
                          gap.label,
                          gap.fromNames,
                        )}
                      />
                      <SaveButton
                        type="submit"
                        size="sm"
                        variant="outline"
                        id={`save-brief-${fieldKey}`}
                      >
                        Save a brief for this topic
                      </SaveButton>
                    </SaveForm>
                  ) : null}
                  {canManage ? (
                    <SaveForm
                      action={createCompeteMove}
                      successMessage="Compete move saved. GroovGro did not do this or change the live website."
                    >
                      <input type="hidden" name="title" value={fromGap.title} />
                      <input type="hidden" name="note" value={fromGap.note} />
                      <SaveButton
                        type="submit"
                        size="sm"
                        variant="outline"
                        id={`save-move-${fieldKey}`}
                      >
                        I will cover this
                      </SaveButton>
                    </SaveForm>
                  ) : null}
                </div>
                );
              })
            )}
          </div>
        ) : null}
        {sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a competitor website first. GroovGro will not invent who you
            compete with.
          </p>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <div key={site.id} className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {site.name} · {site.host}
                </p>
                <p className="text-xs text-muted-foreground">{site.url}</p>
                {site.competeNote ? (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {site.modelGuess ? (
                      <p>
                        <span className="font-medium text-foreground">How they sell. </span>
                        {site.modelGuess}
                      </p>
                    ) : null}
                    {site.marketingGuess ? (
                      <p>
                        <span className="font-medium text-foreground">How they market. </span>
                        {site.marketingGuess}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-medium text-foreground">How we might compete. </span>
                      {site.competeNote}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Saved. GroovGro has not read this page yet.
                  </p>
                )}
                {canManage ? (
                  <SaveForm
                    action={lookAtCompetitorSite}
                    successMessage="Competitor look saved. GroovGro did not copy their words, buy ads, or search Google."
                    className="space-y-3"
                  >
                    <input type="hidden" name="siteId" value={site.id} />
                    <div className="space-y-2">
                      <Label htmlFor={`pageText-${site.id}`}>
                        If the site blocks GroovGro, paste the public page
                      </Label>
                      <Textarea
                        id={`pageText-${site.id}`}
                        name="pageText"
                        rows={4}
                        placeholder="Optional. Paste what you see on that public page. GroovGro will not search Google."
                      />
                    </div>
                    <SaveButton type="submit" pendingLabel="Reading…">
                      Read this website
                    </SaveButton>
                  </SaveForm>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {searches.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Searches you can run to find more</p>
              <p className="text-xs text-muted-foreground">
                These are the best stored terms for this business type. You
                run the search. GroovGro will not search Google.
              </p>
            </div>
            {searches.map((hint) => {
              const fieldKey = hint.query.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              return (
              <div key={hint.query} className="space-y-3 rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  “{hint.query}” — {hint.why}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={hint.ownerSearchHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open this search
                  </a>
                </Button>
                {canManage ? (
                  <SaveForm
                    action={createCompetitorSite}
                    successMessage="Competitor website saved. GroovGro has not searched Google."
                    className="grid gap-3"
                    resetOnSuccess
                  >
                    <input type="hidden" name="foundFrom" value={hint.query} />
                    <div className="space-y-2">
                      <Label htmlFor={`foundName-${fieldKey}`}>
                        Competitor name
                      </Label>
                      <Input
                        id={`foundName-${fieldKey}`}
                        name="name"
                        placeholder="Optional."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`foundUrl-${fieldKey}`}>
                        Website you found
                      </Label>
                      <Input
                        id={`foundUrl-${fieldKey}`}
                        name="url"
                        required
                        placeholder="https://example.com"
                      />
                    </div>
                    <SaveButton type="submit">Save this competitor</SaveButton>
                  </SaveForm>
                ) : null}
              </div>
              );
            })}
          </div>
        ) : null}

        {canManage ? (
          <SaveForm
            action={createCompeteMove}
            successMessage="Compete move saved. GroovGro did not do this or change the live website."
            className="grid gap-3"
            resetOnSuccess
          >
            <div className="space-y-2">
              <Label htmlFor="competeMoveTitle">What I will do</Label>
              <Input
                id="competeMoveTitle"
                name="title"
                required
                placeholder="Required. GroovGro will not do this for you."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competeMoveNote">How you will do it, if you want</Label>
              <Textarea
                id="competeMoveNote"
                name="note"
                rows={3}
                placeholder="Optional. GroovGro will not publish or change the live website."
              />
            </div>
            <SaveButton type="submit">Save what I will do</SaveButton>
          </SaveForm>
        ) : null}

        {canManage ? (
          <SaveForm
            action={createCompetitorSite}
            successMessage="Competitor website saved. GroovGro has not searched Google."
            className="grid gap-3"
            resetOnSuccess
          >
            <div className="space-y-2">
              <Label htmlFor="competitorName">Competitor name</Label>
              <Input
                id="competitorName"
                name="name"
                placeholder="Optional. GroovGro can use the website name."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competitorUrl">Competitor website</Label>
              <Input
                id="competitorUrl"
                name="url"
                required
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competitorNote">Why they matter, if you want</Label>
              <Textarea
                id="competitorNote"
                name="note"
                rows={3}
                placeholder="Optional. GroovGro will not scrape Google."
              />
            </div>
            <SaveButton type="submit">Save competitor website</SaveButton>
          </SaveForm>
        ) : (
          <p className="text-sm text-muted-foreground">
            An owner or admin can save a competitor website. GroovGro will not
            scrape Google.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
