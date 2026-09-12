import { createGeoQuery } from "@/lib/actions/geo-queries";
import {
  describeGeoQuery,
  describeGeoQueriesHeading,
  geoQueriesNeedingWhy,
  sortGeoQueriesForPanel,
  type GeoQueryView,
} from "@/lib/geo/queries";
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

export function GeoQueriesPanel({
  queries,
  querySuggestions,
  canManage = true,
}: {
  queries: GeoQueryView[]
  querySuggestions: string[]
  canManage?: boolean
}) {
  const listed = sortGeoQueriesForPanel(queries);
  const needingWhyCount = geoQueriesNeedingWhy(queries).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {describeGeoQueriesHeading(queries.length, needingWhyCount)}
        </CardTitle>
        <CardDescription>
          Save questions you already care about. Questions that still need a why are listed first. GroovGro will not ask an AI
          system, scrape answers, or treat one answer as truth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {listed.length > 0 ? (
          <div className="space-y-2">
            {listed.map((row) => (
              <div key={row.id} className="space-y-1">
                <p className="text-sm font-medium">{describeGeoQuery(row)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No questions in the library yet. A later allowed adapter can ask
            these. Not in this slice.
          </p>
        )}

        {canManage ? (
          <SaveForm
            action={createGeoQuery}
            successMessage="Question saved to the library. GroovGro did not ask an AI system."
            className="grid gap-3"
            resetOnSuccess
          >
            <div className="space-y-2">
              <Label htmlFor="geoLibraryQuery">Question to remember</Label>
              <Input
                id="geoLibraryQuery"
                name="query"
                list="geo-library-query-suggestions"
                placeholder="Who should I hire for this work?"
                required
              />
              {querySuggestions.length > 0 ? (
                <datalist id="geo-library-query-suggestions">
                  {querySuggestions.map((query) => (
                    <option key={query} value={query} />
                  ))}
                </datalist>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="geoLibraryWhy">Why this question matters</Label>
              <Textarea
                id="geoLibraryWhy"
                name="why"
                rows={3}
                placeholder="Optional. GroovGro will not ask an AI system."
              />
            </div>
            <SaveButton type="submit">Save question to the library</SaveButton>
          </SaveForm>
        ) : (
          <p className="text-sm text-muted-foreground">
            An owner or admin can save a question. GroovGro will not ask an AI
            system.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
