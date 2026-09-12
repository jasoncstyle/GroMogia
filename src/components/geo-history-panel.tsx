import { createGeoHistory } from "@/lib/actions/geo-history";
import {
  describeGeoHistory,
  describeGeoHistoryHeading,
  queriesNeedingHistory,
  sortQueriesForHistory,
  GEO_ANSWER_NO,
  GEO_ANSWER_UNSURE,
  GEO_ANSWER_YES,
  type GeoHistoryView,
} from "@/lib/geo/history";
import type { GeoQueryView } from "@/lib/geo/queries";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function GeoHistoryPanel({
  history,
  queries,
  canManage = true,
}: {
  history: GeoHistoryView[]
  queries: GeoQueryView[]
  canManage?: boolean
}) {
  const needingCount = queriesNeedingHistory(queries, history).length;
  const queriesToShow = sortQueriesForHistory(queries, history);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {describeGeoHistoryHeading(history.length, needingCount)}
        </CardTitle>
        <CardDescription>
          Save another snapshot of what you already heard for a library
          question. Questions that still need a snapshot are listed first.
          GroovGro will not ask an AI system, scrape answers, or treat one answer as truth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {queries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Save a question to the library first. GroovGro will not guess
            visibility history.
          </p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No history snapshots yet. A later allowed adapter can add
            measurements. Not in this slice.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((row) => (
              <div key={row.id} className="space-y-1">
                <p className="text-sm font-medium">{describeGeoHistory(row)}</p>
                {row.note ? (
                  <p className="text-sm text-muted-foreground">{row.note}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {row.createdAt.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {canManage && queries.length > 0 ? (
          <SaveForm
            action={createGeoHistory}
            successMessage="Visibility history saved. GroovGro did not ask an AI system."
            className="grid gap-3"
            resetOnSuccess
          >
            <div className="space-y-2">
              <Label htmlFor="geoHistoryQuery">Saved library question</Label>
              <select
                id="geoHistoryQuery"
                name="queryId"
                className={selectClassName}
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Pick a saved question
                </option>
                {queriesToShow.map((query) => (
                  <option key={query.id} value={query.id}>
                    {query.query}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="geoHistoryMentioned">Was the business mentioned?</Label>
              <select
                id="geoHistoryMentioned"
                name="mentioned"
                className={selectClassName}
                defaultValue={GEO_ANSWER_UNSURE}
                required
              >
                <option value={GEO_ANSWER_YES}>Yes</option>
                <option value={GEO_ANSWER_NO}>No</option>
                <option value={GEO_ANSWER_UNSURE}>Not sure</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="geoHistoryCited">Was the business cited?</Label>
              <select
                id="geoHistoryCited"
                name="cited"
                className={selectClassName}
                defaultValue={GEO_ANSWER_UNSURE}
              >
                <option value={GEO_ANSWER_YES}>Yes</option>
                <option value={GEO_ANSWER_NO}>No</option>
                <option value={GEO_ANSWER_UNSURE}>Not sure</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="geoHistoryNote">Anything else you already noticed</Label>
              <Textarea
                id="geoHistoryNote"
                name="note"
                rows={3}
                placeholder="Optional. GroovGro will not ask an AI system."
              />
            </div>
            <SaveButton type="submit">Save visibility history</SaveButton>
          </SaveForm>
        ) : canManage ? null : (
          <p className="text-sm text-muted-foreground">
            An owner or admin can save history. GroovGro will not ask an AI
            system.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
