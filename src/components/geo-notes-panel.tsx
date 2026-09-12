import { createGeoNote } from "@/lib/actions/geo-notes";
import {
  describeGeoNote,
  describeGeoNotesHeading,
  geoNotesNamingAQuestion,
  sortGeoNotesForPanel,
  type GeoNoteView,
} from "@/lib/geo/notes";
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

export function GeoNotesPanel({
  notes,
  querySuggestions,
  canManage = true,
}: {
  notes: GeoNoteView[]
  querySuggestions: string[]
  canManage?: boolean
}) {
  const listed = sortGeoNotesForPanel(notes);
  const namedQueryCount = geoNotesNamingAQuestion(notes).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {describeGeoNotesHeading(notes.length, namedQueryCount)}
        </CardTitle>
        <CardDescription>
          Save what you already heard when you asked an AI system about this
          business. Notes that name a question are listed first. GroovGro will not ask AI systems, scrape answers, or treat
          one answer as truth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {listed.length > 0 ? (
          <div className="space-y-2">
            {listed.map((note) => (
              <div key={note.id} className="space-y-1">
                <p className="text-sm font-medium">{describeGeoNote(note)}</p>
                {note.note ? (
                  <p className="text-sm text-muted-foreground">{note.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No owner notes yet. A later allowed adapter can add AI-answer
            history. Not in this slice.
          </p>
        )}

        {canManage ? (
          <SaveForm
            action={createGeoNote}
            successMessage="AI visibility note saved. GroovGro did not ask an AI system."
            className="grid gap-3"
            resetOnSuccess
          >
            <div className="space-y-2">
              <Label htmlFor="geoQuery">Question you already asked</Label>
              <Input
                id="geoQuery"
                name="query"
                list="geo-query-suggestions"
                placeholder="Optional. Use a stored query or type one."
              />
              {querySuggestions.length > 0 ? (
                <datalist id="geo-query-suggestions">
                  {querySuggestions.map((query) => (
                    <option key={query} value={query} />
                  ))}
                </datalist>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="geoPlace">Where you already asked</Label>
              <Input
                id="geoPlace"
                name="place"
                placeholder="Optional. Type the place yourself."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="geoHeard">What you already heard</Label>
              <Input
                id="geoHeard"
                name="heard"
                placeholder="They named us, or they named someone else"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="geoNote">Anything else you already noticed</Label>
              <Textarea
                id="geoNote"
                name="note"
                rows={3}
                placeholder="Optional. GroovGro will not ask an AI system."
              />
            </div>
            <SaveButton type="submit">Save AI visibility note</SaveButton>
          </SaveForm>
        ) : (
          <p className="text-sm text-muted-foreground">
            An owner or admin can save what they already heard. GroovGro will
            not scrape AI answers.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
