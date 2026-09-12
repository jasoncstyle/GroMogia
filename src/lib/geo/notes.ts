import { normalizeQueryKey } from "@/lib/growth/seo-actions";

import { GEO_EVIDENCE_OWNER } from "@/lib/geo/architecture";

export const GEO_NOTE_SOURCE_OWNER = GEO_EVIDENCE_OWNER;

export type GeoNoteDraft = {
  organizationId: string
  query: string
  queryKey: string
  place: string
  heard: string
  note: string
  source: typeof GEO_NOTE_SOURCE_OWNER
};

export type GeoNoteView = {
  id: string
  query: string
  place: string
  heard: string
  note: string
  source: string
  createdAt: Date
};

export function planGeoNote(input: {
  organizationId: string
  query?: string | null
  place?: string | null
  heard?: string | null
  note?: string | null
}): GeoNoteDraft {
  const heard = (input.heard ?? "").trim().replace(/\s+/g, " ");
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  if (!heard) {
    throw new Error("Add what you already heard.");
  }
  const query = (input.query ?? "").trim().replace(/\s+/g, " ");
  return {
    organizationId: input.organizationId,
    query,
    queryKey: query ? normalizeQueryKey(query) : "",
    place: (input.place ?? "").trim().replace(/\s+/g, " "),
    heard,
    note: (input.note ?? "").trim(),
    source: GEO_NOTE_SOURCE_OWNER,
  };
}

export function describeGeoNote(
  note: Pick<GeoNoteView, "query" | "place" | "heard">,
): string {
  const place = note.place ? ` in ${note.place}` : "";
  if (note.query) {
    return `The owner already asked “${note.query}”${place} and heard: ${note.heard}`;
  }
  if (note.place) {
    return `The owner already heard${place}: ${note.heard}`;
  }
  return `The owner already heard: ${note.heard}`;
}

export function geoNotesNamingAQuestion<T extends { query?: string | null }>(
  rows: T[],
): T[] {
  return rows.filter((row) => Boolean((row.query ?? "").trim()));
}

export function describeGeoNotesHeading(noteCount = 0, namedQueryCount = 0): string {
  if (noteCount <= 0 && namedQueryCount <= 0) {
    return "What you already hear from AI";
  }
  const notes = noteCount <= 0 ? "" : ` · ${noteCount}`;
  const named =
    namedQueryCount <= 0 ? "" : ` · ${namedQueryCount} name a question`;
  return `What you already hear from AI${notes}${named}`;
}

export function sortGeoNotesForPanel<T extends { query?: string | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((left, right) => {
    const leftQuery = (left.query ?? "").trim() ? 0 : 1;
    const rightQuery = (right.query ?? "").trim() ? 0 : 1;
    if (leftQuery !== rightQuery) return leftQuery - rightQuery;
    return 0;
  });
}
