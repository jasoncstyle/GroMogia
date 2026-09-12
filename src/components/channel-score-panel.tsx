import {
  channelScoreLabelTitle,
  describeChannelScoreHeading,
  type ChannelScoreView,
} from "@/lib/growth/channel-score";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ChannelScorePanel({
  scores,
}: {
  scores: ChannelScoreView[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {describeChannelScoreHeading(
            scores.length,
            scores.filter((row) => row.label === "review").length,
          )}
        </CardTitle>
        <CardDescription>
          These ranks are estimates from stored workspace facts. Channels worth a look are listed first.
          GroovGro will not change today&apos;s Next step from this estimate, buy
          ads, or run work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {scores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not enough stored people, page, content, or AI visibility facts
            yet to compare. GroovGro will not guess.
          </p>
        ) : (
          scores.map((row) => (
            <div key={row.channel} className="space-y-1">
              <p className="text-sm font-medium">
                {row.title} · {row.labelTitle || channelScoreLabelTitle(row.label)}
              </p>
              <p className="text-sm text-muted-foreground">{row.why}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
