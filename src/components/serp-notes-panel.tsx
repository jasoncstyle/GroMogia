import Link from "next/link";

import { createSerpNote } from "@/lib/actions/serp-notes";
import {
  describeSerpNote,
  describeSerpNotesHeading,
  type SerpNoteView,
} from "@/lib/growth/serp-notes";
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

export function SerpNotesPanel({
  notes,
  knownCompetitors,
  querySuggestions,
  canManage = true,
}: {
  notes: SerpNoteView[]
  knownCompetitors: string[]
  querySuggestions: string[]
  canManage?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{describeSerpNotesHeading(notes.length)}</CardTitle>
        <CardDescription>
          Save competitors you already know for a search query. GroovGro will
          not look these businesses up, scrape search results, or buy a SERP
          vendor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {knownCompetitors.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            From Business: {knownCompetitors.join(", ")}.{" "}
            <Link href="/app/business" className="underline underline-offset-2">
              Edit on Business
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No competitors are saved on Business yet. Add names there if you
            already know them. GroovGro will not look anyone up.
          </p>
        )}

        {notes.length > 0 ? (
          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="space-y-1">
                <p className="text-sm font-medium">{describeSerpNote(note)}</p>
                {note.note ? (
                  <p className="text-sm text-muted-foreground">{note.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No owner notes yet. A later allowed provider can add search-result
            history. Not in this slice.
          </p>
        )}

        {canManage ? (
          <SaveForm
            action={createSerpNote}
            successMessage="Competitor note saved. GroovGro did not look anyone up."
            className="grid gap-3"
            resetOnSuccess
          >
            <div className="space-y-2">
              <Label htmlFor="serpQuery">Search query you already see</Label>
              <Input
                id="serpQuery"
                name="query"
                list="serp-query-suggestions"
                placeholder="Optional. Use a stored query or type one."
              />
              {querySuggestions.length > 0 ? (
                <datalist id="serp-query-suggestions">
                  {querySuggestions.map((query) => (
                    <option key={query} value={query} />
                  ))}
                </datalist>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="serpCompetitor">Competitor you already know</Label>
              <Input
                id="serpCompetitor"
                name="competitorName"
                list="serp-competitor-suggestions"
                placeholder="Name only"
                required
              />
              {knownCompetitors.length > 0 ? (
                <datalist id="serp-competitor-suggestions">
                  {knownCompetitors.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="serpNote">What you already noticed</Label>
              <Textarea
                id="serpNote"
                name="note"
                rows={3}
                placeholder="Optional. GroovGro will not visit their website."
              />
            </div>
            <SaveButton type="submit">Save competitor note</SaveButton>
          </SaveForm>
        ) : (
          <p className="text-sm text-muted-foreground">
            An owner or admin can save a competitor note. GroovGro will not
            scrape search results.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
