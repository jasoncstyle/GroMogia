import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { builderRows, builderSections } from "@/lib/db/schema";
import {
  clampColumnIndex,
  parseColumnWidths,
  parseContentWidth,
} from "@/lib/website-builder/layout";
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
