import { createContentBrief } from "@/lib/actions/content-briefs";
import {
  describeContentBrief,
  suggestBriefOutline,
  type ContentBriefView,
} from "@/lib/growth/content-briefs";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ContentBriefsPanel({
  briefs,
  querySuggestions,
  canManage = true,
}: {
  briefs: ContentBriefView[]
  querySuggestions: string[]
  canManage?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content planner</CardTitle>
        <CardDescription>
          Save a brief for a query you already stored. GroovGro will not write
          the page, generate article copy, or publish.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {briefs.length > 0 ? (
          <div className="space-y-3">
            {briefs.map((brief) => (
              <div key={brief.id} className="space-y-1">
                <p className="text-sm font-medium">{describeContentBrief(brief)}</p>
                {brief.audience ? (
                  <p className="text-sm text-muted-foreground">
                    For: {brief.audience}
                  </p>
                ) : null}
                {brief.outline ? (
                  <p className="text-sm text-muted-foreground">{brief.outline}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No briefs yet. Use a stored query or a missing-page query. Later
            work can write the page. Not in this slice.
          </p>
        )}

        {canManage ? (
          <SaveForm
            action={createContentBrief}
            successMessage="Content brief saved to the planner. GroovGro did not write a page."
            className="grid gap-3"
            resetOnSuccess
          >
            <div className="space-y-2">
              <Label htmlFor="briefQuery">Search query this brief is for</Label>
              <Input
                id="briefQuery"
                name="query"
                list="brief-query-suggestions"
                placeholder="Optional. Use a stored or missing-page query."
              />
              {querySuggestions.length > 0 ? (
                <datalist id="brief-query-suggestions">
                  {querySuggestions.map((query) => (
                    <option key={query} value={query} />
                  ))}
                </datalist>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="briefTitle">Working title</Label>
              <Input
                id="briefTitle"
                name="title"
                placeholder="Required unless you picked a query"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="briefAudience">Who this is for</Label>
              <Input
                id="briefAudience"
                name="audience"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="briefOutline">What the page should cover</Label>
              <Textarea
                id="briefOutline"
                name="outline"
                rows={3}
                placeholder={suggestBriefOutline("")}
              />
            </div>
            <SaveButton type="submit">Save brief to planner</SaveButton>
          </SaveForm>
        ) : (
          <p className="text-sm text-muted-foreground">
            An owner or admin can save a brief. GroovGro will not write the
            page.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
