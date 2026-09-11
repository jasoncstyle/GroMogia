import {
  createCompetitorSite,
  lookAtCompetitorSite,
} from "@/lib/actions/competitor-sites";
import {
  type CompetitorCompareView,
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
  canManage = true,
}: {
  sites: CompetitorSiteView[]
  searches: CompetitorSearchHint[]
  compare?: CompetitorCompareView | null
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
          to what you sell. If the site blocks the automated read, paste what
          you see. It will not scrape Google, copy their words onto your
          site, or buy ads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {compare ? (
          <div className="space-y-1 rounded-lg border p-3">
            <p className="text-sm font-medium">How these sites compare</p>
            <p className="text-sm text-muted-foreground">{compare.note}</p>
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
