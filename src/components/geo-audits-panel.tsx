import {
  describeGeoAudit,
  type GeoAuditView,
} from "@/lib/geo/audits";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GeoAuditsPanel({
  audits,
  hasHistory,
}: {
  audits: GeoAuditView[]
  hasHistory: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Citation gaps from what you already measured</CardTitle>
        <CardDescription>
          GroovGro compared the latest saved visibility snapshot for each
          library question. It will not ask an AI system, scrape answers, or
          treat one answer as truth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasHistory ? (
          <p className="text-sm text-muted-foreground">
            Save visibility history first. GroovGro will not guess citation
            gaps.
          </p>
        ) : audits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No citation gaps from the latest saved snapshots. Unsure answers
            stay out of this list.
          </p>
        ) : (
          audits.map((row) => (
            <div key={row.queryId} className="space-y-1">
              <p className="text-sm font-medium">{describeGeoAudit(row)}</p>
              <p className="text-sm text-muted-foreground">{row.why}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
