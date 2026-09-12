import { createContentBrief } from "@/lib/actions/content-briefs";
import {
  hasSavedContentBriefForTopic,
  suggestBriefOutline,
  type ContentBriefView,
} from "@/lib/growth/content-briefs";
import {
  contentGapsNeedingBrief,
  contentGapsWithBrief,
  describeContentGapsHeading,
  shouldGroupContentGaps,
  sortContentGapsForPanel,
  type ContentGapView,
} from "@/lib/growth/content-gaps";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ContentGapsPanel({
  gaps,
  briefs = [],
  pagesRead,
  canManage = true,
}: {
  gaps: ContentGapView[]
  briefs?: Pick<ContentBriefView, "query" | "title">[]
  pagesRead: boolean
  canManage?: boolean
}) {
  const isSaved = (query: string) =>
    hasSavedContentBriefForTopic(briefs, query);
  const briefedCount = gaps.filter((gap) => isSaved(gap.query)).length;
  const gapsToShow = sortContentGapsForPanel(gaps, isSaved);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{describeContentGapsHeading(gaps.length, briefedCount)}</CardTitle>
        <CardDescription>
          GroovGro compared stored Search Console queries marked worth a look
          to pages it already read. It did not invent topics, scrape
          competitors, or create a page. You can save a brief here. Queries
          that still need a brief are listed first. GroovGro will not write
          that page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!pagesRead ? (
          <p className="text-sm text-muted-foreground">
            Read the connected website first. GroovGro will not guess missing
            pages.
          </p>
        ) : gaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No worth-a-look queries are missing from the pages GroovGro
            already read. Tiny Search Console rows stay out of this list.
          </p>
        ) : (
          (shouldGroupContentGaps(gapsToShow, isSaved)
            ? [
                {
                  label: "Still need a brief",
                  rows: contentGapsNeedingBrief(gapsToShow, isSaved),
                },
                {
                  label: "Already have a brief",
                  rows: contentGapsWithBrief(gapsToShow, isSaved),
                },
              ]
            : [{ label: "", rows: gapsToShow }]
          ).map((group) => (
            <div key={group.label || "gaps"} className="space-y-3">
              {group.label ? (
                <p className="text-xs font-medium text-muted-foreground">
                  {group.label}
                </p>
              ) : null}
              {group.rows.map((gap) => {
            const fieldKey = gap.queryKey.replace(/[^a-z0-9]+/g, "-");
            return (
              <div key={gap.queryKey} className="space-y-2">
                <p className="text-sm font-medium">{gap.query}</p>
                <p className="text-sm text-muted-foreground">{gap.why}</p>
                {canManage ? (
                  hasSavedContentBriefForTopic(briefs, gap.query) ? (
                    <p className="text-sm text-muted-foreground">
                      Already saved on the planner.
                    </p>
                  ) : (
                    <SaveForm
                      action={createContentBrief}
                      successMessage="Content brief saved to the planner. GroovGro did not write a page."
                    >
                      <input type="hidden" name="query" value={gap.query} />
                      <input type="hidden" name="title" value={gap.query} />
                      <input type="hidden" name="source" value="content_gap" />
                      <input
                        type="hidden"
                        name="outline"
                        value={suggestBriefOutline(gap.query)}
                      />
                      <SaveButton
                        type="submit"
                        size="sm"
                        variant="outline"
                        id={`save-gap-brief-${fieldKey}`}
                      >
                        Save a brief for this query
                      </SaveButton>
                    </SaveForm>
                  )
                ) : null}
              </div>
            );
          })}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
