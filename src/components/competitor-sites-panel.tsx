import {
  createCompetitorSite,
  lookAtCompetitorSite,
} from "@/lib/actions/competitor-sites";
import {
  type CompetitorSearchHint,
  type CompetitorSiteView,
} from "@/lib/growth/competitor-looks";
import { SaveButton, SaveForm } from "@/components/save-form";
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
  canManage = true,
}: {
  sites: CompetitorSiteView[]
  searches: CompetitorSearchHint[]
  canManage?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How we might compete</CardTitle>
        <CardDescription>
          Save a competitor website you already know. GroovGro can read that
          public page and suggest how to compete. If the site blocks the
          automated read, paste what you see on that public page. It will not
          scrape Google, copy their words onto your site, or buy ads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  <p className="text-sm text-muted-foreground">
                    {site.competeNote}
                  </p>
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
          <div className="space-y-2">
            <p className="text-sm font-medium">Searches to find more later</p>
            <p className="text-xs text-muted-foreground">
              These come from the saved business type and Search Console
              queries. GroovGro has not searched them. A later allowed adapter
              can.
            </p>
            {searches.map((hint) => (
              <p key={hint.query} className="text-sm text-muted-foreground">
                “{hint.query}” — {hint.why}
              </p>
            ))}
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
