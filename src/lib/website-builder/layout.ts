export function moveSectionId(
  ids: string[],
  sectionId: string,
  direction: "up" | "down",
): string[] {
  const index = ids.indexOf(sectionId);
  if (index < 0) return ids;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= ids.length) return ids;
  const next = [...ids];
  const current = next[index];
  const other = next[swapWith];
  if (!current || !other) return ids;
  next[index] = other;
  next[swapWith] = current;
  return next;
}

export function moveSectionIdToIndex(
  ids: string[],
  draggedId: string,
  targetId: string,
): string[] {
  if (draggedId === targetId) return ids;
  const from = ids.indexOf(draggedId);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0) return ids;
  const next = [...ids];
  const [removed] = next.splice(from, 1);
  if (!removed) return ids;
  next.splice(to, 0, removed);
  return next;
}
