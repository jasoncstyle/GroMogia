/**
 * Owner-saved compete moves. The owner names what they will do.
 * GroovGro does not do the work, publish, or add a Next step.
 */
export const COMPETE_MOVE_SOURCE_OWNER = "owner";
export const COMPETE_MOVE_STATUS_PLANNED = "planned";
export const COMPETE_MOVE_STATUS_DONE = "owner_done";
export const COMPETE_MOVE_MAX_SHOWN = 12;

export type CompeteMoveDraft = {
  organizationId: string
  title: string
  note: string
  status: typeof COMPETE_MOVE_STATUS_PLANNED
  source: typeof COMPETE_MOVE_SOURCE_OWNER
};

export type CompeteMoveView = {
  id: string
  title: string
  note: string
  status?: string
  createdAt: Date
};

export function planCompeteMove(input: {
  organizationId: string
  title?: string | null
  note?: string | null
}): CompeteMoveDraft {
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  const title = (input.title ?? "").trim().replace(/\s+/g, " ");
  if (!title) {
    throw new Error("Say what you will do.");
  }
  return {
    organizationId: input.organizationId,
    title,
    note: (input.note ?? "").trim(),
    status: COMPETE_MOVE_STATUS_PLANNED,
    source: COMPETE_MOVE_SOURCE_OWNER,
  };
}

export function describeCompeteMove(
  row: Pick<CompeteMoveView, "title" | "note" | "status">,
): string {
  if (row.status === COMPETE_MOVE_STATUS_DONE) {
    return `You did: “${row.title}”. GroovGro did not do this or change the live website.`;
  }
  if (row.note) {
    return `You will: “${row.title}”. ${row.note}`;
  }
  return `You will: “${row.title}”. GroovGro has not done this or changed the live website.`;
}

export function planCompeteMoveDone(input: {
  organizationId: string
  moveId?: string | null
}): {
  organizationId: string
  moveId: string
  status: typeof COMPETE_MOVE_STATUS_DONE
} {
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  const moveId = (input.moveId ?? "").trim();
  if (!moveId) {
    throw new Error("Pick a saved move first.");
  }
  return {
    organizationId: input.organizationId,
    moveId,
    status: COMPETE_MOVE_STATUS_DONE,
  };
}

export function sortCompeteMovesForList(
  rows: CompeteMoveView[],
): CompeteMoveView[] {
  const planned = rows.filter((row) => row.status !== COMPETE_MOVE_STATUS_DONE);
  const done = rows.filter((row) => row.status === COMPETE_MOVE_STATUS_DONE);
  return [...planned, ...done];
}

export function competeMovesToShow(rows: CompeteMoveView[]): CompeteMoveView[] {
  return sortCompeteMovesForList(rows).slice(0, COMPETE_MOVE_MAX_SHOWN);
}

export function plannedCompeteMoves<T extends Pick<CompeteMoveView, "status">>(
  moves: T[],
): T[] {
  return moves.filter((move) => move.status !== COMPETE_MOVE_STATUS_DONE);
}

export function doneCompeteMoves<T extends Pick<CompeteMoveView, "status">>(
  moves: T[],
): T[] {
  return moves.filter((move) => move.status === COMPETE_MOVE_STATUS_DONE);
}

export function countPlannedCompeteMoves(
  moves: Pick<CompeteMoveView, "status">[],
): number {
  return plannedCompeteMoves(moves).length;
}

export function shouldGroupCompeteMoves(
  moves: Pick<CompeteMoveView, "status">[],
): boolean {
  return plannedCompeteMoves(moves).length > 0 && doneCompeteMoves(moves).length > 0;
}

export function describeCompeteMoveGroupHeading(
  kind: "planned" | "done",
  count: number,
): string {
  if (kind === "planned") {
    return `Still planned · ${count}`;
  }
  return `Marked done · ${count}`;
}

export function describeCompeteMoveListHeading(
  plannedCount: number,
  totalCount: number,
): string {
  if (totalCount <= 0) {
    return "What I will do";
  }
  if (plannedCount > 0) {
    return `What I will do · ${plannedCount} still planned`;
  }
  return "What I will do · all marked done";
}

export function normalizeCompeteMoveTitle(title?: string | null): string {
  return (title ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function hasSavedCompeteMoveTitle(
  moves: Pick<CompeteMoveView, "title">[],
  title?: string | null,
): boolean {
  const needle = normalizeCompeteMoveTitle(title);
  if (!needle) {
    return false;
  }
  return moves.some((move) => normalizeCompeteMoveTitle(move.title) === needle);
}

export function refuseDuplicateCompeteMoveTitle(
  moves: Pick<CompeteMoveView, "title">[],
  title?: string | null,
): void {
  if (hasSavedCompeteMoveTitle(moves, title)) {
    throw new Error("That compete move is already saved.");
  }
}

export function suggestCompeteMoveFromCompare(input?: {
  ourLead?: string | null
  theirLead?: string | null
} | null): { title: string; note: string } {
  const ours = (input?.ourLead ?? "").replace(/\s+/g, " ").trim();
  const theirs = (input?.theirLead ?? "").replace(/\s+/g, " ").trim();
  if (ours && theirs) {
    return {
      title: `Make “${ours}” easier to see than “${theirs}”`,
      note: "This is from competitor websites you asked GroovGro to read. GroovGro will not do this, copy their words, or change the live website.",
    };
  }
  if (ours) {
    return {
      title: `Make “${ours}” easier to see`,
      note: "This is from competitor websites you asked GroovGro to read. GroovGro will not do this, copy their words, or change the live website.",
    };
  }
  return { title: "", note: "" };
}

export function suggestCompeteMoveFromGap(label?: string | null): {
  title: string
  note: string
} {
  const topic = (label ?? "").trim().replace(/\s+/g, " ");
  if (!topic) {
    return { title: "", note: "" };
  }
  return {
    title: `Cover “${topic}” on our site`,
    note: "A competitor site you named shows this topic. GroovGro has not read it on your pages. GroovGro will not do this or create the page.",
  };
}
