import {
  describeContentGapsHeading,
  type ContentGapView,
} from "@/lib/growth/content-gaps";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ContentGapsPanel({
  gaps,
  pagesRead,
}: {
  gaps: ContentGapView[]
  pagesRead: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{describeContentGapsHeading(gaps.length)}</CardTitle>
        <CardDescription>
          GroovGro compared stored Search Console queries marked worth a look
          to pages it already read. It did not invent topics, scrape
          competitors, or create a page. Save a brief on the planner if you
          want to plan one.
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
          gaps.map((gap) => (
            <div key={gap.queryKey} className="space-y-1">
              <p className="text-sm font-medium">{gap.query}</p>
              <p className="text-sm text-muted-foreground">{gap.why}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
