import type { BuilderLayoutRow, BuilderLayoutWidget } from "@/lib/website-builder/types";

export const MAX_INNER_ROWS_PER_COLUMN = 3;

export function nestBuilderRows(flat: BuilderLayoutRow[]): BuilderLayoutRow[] {
  const topIds = new Set(flat.filter((row) => !row.parentRowId).map((row) => row.id));
  const byParent = new Map<string, BuilderLayoutRow[]>();
  const tops: BuilderLayoutRow[] = [];

  for (const row of flat) {
    const parentId = row.parentRowId;
    if (parentId && topIds.has(parentId)) {
      const list = byParent.get(parentId) ?? [];
      list.push(row);
      byParent.set(parentId, list);
    } else {
      tops.push(row);
    }
  }

  return tops
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      ...row,
      parentRowId: null,
      parentColumnIndex: null,
      innerRows: (byParent.get(row.id) ?? [])
        .slice()
        .sort((a, b) => {
          const column = (a.parentColumnIndex ?? 0) - (b.parentColumnIndex ?? 0);
          return column !== 0 ? column : a.sortOrder - b.sortOrder;
        })
        .map((child) => ({
          ...child,
          innerRows: [],
        })),
    }));
}

export function innerRowsForColumn(row: BuilderLayoutRow, columnIndex: number) {
  return row.innerRows.filter((inner) => (inner.parentColumnIndex ?? 0) === columnIndex);
}

export function flattenLayoutWidgets(rows: BuilderLayoutRow[]): BuilderLayoutWidget[] {
  return rows.flatMap((row) => [
    ...row.widgets,
    ...row.innerRows.flatMap((inner) => inner.widgets),
  ]);
}

export function rowHasPublishedContent(row: BuilderLayoutRow): boolean {
  if (row.widgets.length > 0) return true;
  return row.innerRows.some((inner) => inner.widgets.length > 0);
}

export function findLayoutRow(
  rows: BuilderLayoutRow[],
  id: string | null | undefined,
): BuilderLayoutRow | undefined {
  if (!id) return undefined;
  for (const row of rows) {
    if (row.id === id) return row;
    const inner = row.innerRows.find((candidate) => candidate.id === id);
    if (inner) return inner;
  }
}
