import type { BuilderSectionContent } from "@/lib/db/schema";

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
  widgets: BuilderLayoutWidget[]
};
