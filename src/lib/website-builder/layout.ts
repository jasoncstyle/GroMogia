export type RowLayoutId =
  | "1"
  | "1-1"
  | "1-1-1"
  | "1-1-1-1"
  | "2-1"
  | "1-2"
  | "1-2-1";

export type RowLayout = {
  id: RowLayoutId
  label: string
  hint: string
  widths: number[]
};

export const ROW_LAYOUTS: RowLayout[] = [
  { id: "1", label: "One column", hint: "Full width", widths: [100] },
  { id: "1-1", label: "Two columns", hint: "Half and half", widths: [50, 50] },
  { id: "1-1-1", label: "Three columns", hint: "One row, three boxes", widths: [34, 33, 33] },
  { id: "1-1-1-1", label: "Four columns", hint: "Four equal boxes", widths: [25, 25, 25, 25] },
  { id: "2-1", label: "Wide left", hint: "Two-thirds plus one-third", widths: [66, 34] },
  { id: "1-2", label: "Wide right", hint: "One-third plus two-thirds", widths: [34, 66] },
  { id: "1-2-1", label: "Wide center", hint: "Narrow, wide, narrow", widths: [25, 50, 25] },
];

export function isRowLayoutId(value: string): value is RowLayoutId {
  return ROW_LAYOUTS.some((layout) => layout.id === value);
}

export function layoutIdForWidths(widths: number[]): RowLayoutId {
  return (
    ROW_LAYOUTS.find((layout) => layout.widths.join() === widths.join())?.id ?? "1"
  );
}

export function widthsForLayout(layoutId: string): number[] {
  return ROW_LAYOUTS.find((layout) => layout.id === layoutId)?.widths.slice() ?? [100];
}

export type RowContentWidth = "narrow" | "normal" | "wide" | "full";

export type RowContentWidthOption = {
  id: RowContentWidth
  label: string
  hint: string
};

export const ROW_CONTENT_WIDTHS: RowContentWidthOption[] = [
  { id: "narrow", label: "Narrow", hint: "Shorter text, like a letter" },
  { id: "normal", label: "Normal", hint: "Usual page width" },
  { id: "wide", label: "Wide", hint: "More of the screen, still not the edges" },
  { id: "full", label: "Edge to edge", hint: "This row, and photos in it, go across the whole screen" },
];

export function isRowContentWidth(value: string): value is RowContentWidth {
  return ROW_CONTENT_WIDTHS.some((option) => option.id === value);
}

export function parseContentWidth(raw: unknown): RowContentWidth {
  const value = String(raw ?? "").trim();
  return isRowContentWidth(value) ? value : "normal";
}

export function rowContentInnerClass(width: RowContentWidth): string {
  if (width === "narrow") return "mx-auto w-full max-w-3xl px-4";
  if (width === "wide") return "mx-auto w-full max-w-7xl px-4";
  if (width === "full") return "w-full";
  return "mx-auto w-full max-w-6xl px-4";
}

export function rowContentWidthLabel(width: RowContentWidth): string {
  return ROW_CONTENT_WIDTHS.find((option) => option.id === width)?.label ?? "Normal";
}

export function parseColumnWidths(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 4) return [100];
  const widths = raw.map((value) => Number(value));
  if (widths.some((width) => !Number.isFinite(width) || width < 10 || width > 90)) {
    return [100];
  }
  const sum = widths.reduce((total, width) => total + width, 0);
  if (sum < 95 || sum > 105) return [100];
  return widths;
}

export function rowGridTemplate(widths: number[]): string {
  return parseColumnWidths(widths).map((width) => `${width}fr`).join(" ");
}

export function clampColumnIndex(columnIndex: number, columnCount: number): number {
  if (columnCount < 1) return 0;
  return Math.max(0, Math.min(columnCount - 1, columnIndex));
}

export function widgetsForColumn<T extends { columnIndex: number; sortOrder: number }>(
  widgets: T[],
  columnIndex: number,
): T[] {
  return widgets
    .filter((widget) => widget.columnIndex === columnIndex)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

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
