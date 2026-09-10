import {
  describeKeywordHistory,
  formatPosition,
  latestKeywordPoint,
  type KeywordWithHistory,
} from "@/lib/growth/keywords";
import { keywordScoreLabelTitle } from "@/lib/growth/keyword-score";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function KeywordHistoryPanel({
  keywords,
}: {
  keywords: KeywordWithHistory[]
}) {
  const rows = keywords.slice(0, 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queries GroovGro has recorded</CardTitle>
        <CardDescription>
          These come from Search Console snapshots GroovGro already stored.
          GroovGro can mark a query worth a look, keep watching, or not enough
          evidence. That rank is an estimate from stored numbers, not search volume or a traffic forecast.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Refresh Search Console to store the queries Google already reported.
            GroovGro will not look these up anywhere else.
          </p>
        ) : (
          rows.map((keyword) => {
            const latest = latestKeywordPoint(keyword.points);
            return (
              <div key={keyword.queryKey} className="space-y-1">
                <p className="text-sm font-medium">{keyword.query}</p>
                <p className="text-sm text-muted-foreground">
                  {keywordScoreLabelTitle(keyword.opportunityLabel)}
                  {keyword.opportunityScore > 0
                    ? ` · estimate ${keyword.opportunityScore} of 100`
                    : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {latest
                    ? `${latest.clicks} clicks · ${latest.impressions} impressions · average position ${formatPosition(latest.position)}`
                    : "No snapshot numbers stored yet."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {keyword.opportunityWhy || describeKeywordHistory(keyword.points)}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
