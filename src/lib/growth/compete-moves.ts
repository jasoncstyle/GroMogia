/**
 * Owner-saved compete moves. The owner names what they will do.
 * GroovGro does not do the work, publish, or add a Next step.
 */
export const COMPETE_MOVE_SOURCE_OWNER = "owner";
export const COMPETE_MOVE_STATUS_PLANNED = "planned";
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
  row: Pick<CompeteMoveView, "title" | "note">,
): string {
  if (row.note) {
    return `You will: “${row.title}”. ${row.note}`;
  }
  return `You will: “${row.title}”. GroovGro has not done this or changed the live website.`;
}

export function competeMovesToShow(rows: CompeteMoveView[]): CompeteMoveView[] {
  return rows.slice(0, COMPETE_MOVE_MAX_SHOWN);
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
