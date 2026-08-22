import type { BuilderSectionContent } from "@/lib/db/schema";
import type { RowContentWidth } from "@/lib/website-builder/layout";
import type { BuilderTheme } from "@/lib/website-builder/style";

export type BuilderLayoutWidget = {
  id: string
  type: string
  visible: boolean
  columnIndex: number
  sortOrder: number
  content: BuilderSectionContent
};

export type BuilderLayoutRow = {
  id: string
  sortOrder: number
  columnWidths: number[]
  backgroundColor: string
  contentWidth: RowContentWidth
  parentRowId: string | null
  parentColumnIndex: number | null
  widgets: BuilderLayoutWidget[]
  innerRows: BuilderLayoutRow[]
};

export type { BuilderTheme };
