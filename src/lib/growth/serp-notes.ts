import { normalizeQueryKey } from "@/lib/growth/seo-actions";

export const SERP_NOTE_SOURCE_OWNER = "owner";

export type SerpNoteDraft = {
  organizationId: string
  query: string
  queryKey: string
  competitorName: string
  note: string
  source: typeof SERP_NOTE_SOURCE_OWNER
};

export type SerpNoteView = {
  id: string
  query: string
  competitorName: string
  note: string
  source: string
  createdAt: Date
};

export function planSerpNote(input: {
  organizationId: string
  query?: string | null
  competitorName?: string | null
  note?: string | null
}): SerpNoteDraft {
  const query = (input.query ?? "").trim().replace(/\s+/g, " ");
  const competitorName = (input.competitorName ?? "").trim().replace(/\s+/g, " ");
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  if (!competitorName) {
    throw new Error("Add a competitor you already know.");
  }
  return {
    organizationId: input.organizationId,
    query,
    queryKey: query ? normalizeQueryKey(query) : "",
    competitorName,
    note: (input.note ?? "").trim(),
    source: SERP_NOTE_SOURCE_OWNER,
  };
}

export function describeSerpNote(note: Pick<SerpNoteView, "query" | "competitorName">): string {
  if (note.query) {
    return `For “${note.query}”, the owner already sees ${note.competitorName}.`;
  }
  return `The owner already knows ${note.competitorName}.`;
}

export function knownCompetitorsNeedingNote(
  knownCompetitors: string[],
  notes: Array<{ competitorName: string }>,
): string[] {
  const saved = new Set(
    notes.map((note) => note.competitorName.trim().toLowerCase()).filter(Boolean),
  );
  return knownCompetitors.filter(
    (name) => !saved.has(name.trim().toLowerCase()),
  );
}

export function describeSerpNotesHeading(
  noteCount = 0,
  remainingCount = 0,
): string {
  if (noteCount <= 0 && remainingCount <= 0) {
    return "Who else you already see";
  }
  const notes = noteCount <= 0 ? "" : ` · ${noteCount}`;
  const remaining =
    remainingCount <= 0
      ? ""
      : ` · ${remainingCount} still ${remainingCount === 1 ? "needs" : "need"} a note`;
  return `Who else you already see${notes}${remaining}`;
}
