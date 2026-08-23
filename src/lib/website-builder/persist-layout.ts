import { and, asc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { builderRows, builderSections } from "@/lib/db/schema";
import {
  clampColumnIndex,
  parseColumnWidths,
  parseContentWidth,
} from "@/lib/website-builder/layout";
import { parseBuilderColor } from "@/lib/website-builder/style";
import type { BuilderRowDraft } from "@/lib/website-builder/row-templates";

type Db = NonNullable<ReturnType<typeof getDb>>;

export async function writeBuilderLayout(
  db: Db,
  input: {
    organizationId: string
    siteId: string
    rows: BuilderRowDraft[]
  },
) {
  await db
    .delete(builderRows)
    .where(
      and(eq(builderRows.siteId, input.siteId), isNotNull(builderRows.parentRowId)),
    );
  await db.delete(builderRows).where(eq(builderRows.siteId, input.siteId));

  for (const [sortOrder, row] of input.rows.entries()) {
    const columnWidths = parseColumnWidths(row.columnWidths);
    const [created] = await db
      .insert(builderRows)
      .values({
        organizationId: input.organizationId,
        siteId: input.siteId,
        sortOrder,
        columnWidths,
        contentWidth: parseContentWidth(row.contentWidth),
        backgroundColor: parseBuilderColor(row.backgroundColor),
      })
      .returning({ id: builderRows.id });
    if (!created) throw new Error("Could not create a layout row.");

    const nextInColumn: Record<number, number> = {};
    for (const widget of row.widgets) {
      const columnIndex = clampColumnIndex(widget.columnIndex, columnWidths.length);
      const widgetOrder = nextInColumn[columnIndex] ?? 0;
      nextInColumn[columnIndex] = widgetOrder + 1;
      await db.insert(builderSections).values({
        organizationId: input.organizationId,
        siteId: input.siteId,
        rowId: created.id,
        columnIndex,
        type: widget.type,
        sortOrder: widgetOrder,
        visible: widget.visible,
        content: widget.content,
      });
    }
  }
}

export async function copyBuilderSiteContent(
  db: Db,
  input: {
    organizationId: string
    fromSiteId: string
    toSiteId: string
  },
) {
  const rows = await db
    .select()
    .from(builderRows)
    .where(
      and(
        eq(builderRows.organizationId, input.organizationId),
        eq(builderRows.siteId, input.fromSiteId),
      ),
    )
    .orderBy(asc(builderRows.sortOrder));
  const sections = await db
    .select()
    .from(builderSections)
    .where(
      and(
        eq(builderSections.organizationId, input.organizationId),
        eq(builderSections.siteId, input.fromSiteId),
      ),
    )
    .orderBy(asc(builderSections.sortOrder));

  const parents = rows.filter((row) => !row.parentRowId);
  const children = rows.filter((row) => row.parentRowId);
  const idMap = new Map<string, string>();

  for (const row of [...parents, ...children]) {
    const id = crypto.randomUUID();
    await db.insert(builderRows).values({
      id,
      organizationId: input.organizationId,
      siteId: input.toSiteId,
      sortOrder: row.sortOrder,
      columnWidths: row.columnWidths,
      backgroundColor: row.backgroundColor,
      contentWidth: row.contentWidth,
      parentRowId: row.parentRowId ? (idMap.get(row.parentRowId) ?? null) : null,
      parentColumnIndex: row.parentColumnIndex,
    });
    idMap.set(row.id, id);
  }

  for (const section of sections) {
    await db.insert(builderSections).values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      siteId: input.toSiteId,
      rowId: section.rowId ? (idMap.get(section.rowId) ?? null) : null,
      columnIndex: section.columnIndex,
      type: section.type,
      sortOrder: section.sortOrder,
      visible: section.visible,
      content: section.content,
    });
  }
}
