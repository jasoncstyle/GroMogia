import type { BuilderSectionDraft } from "@/lib/website-builder/sections";
import {
  rowsForTemplate,
  type BuilderBrandInput,
} from "@/lib/website-builder/row-templates";
import { DEFAULT_BUILDER_THEME, type BuilderTheme } from "@/lib/website-builder/style";

export type { BuilderBrandInput };

export const BUILDER_TEMPLATE_IDS = ["1", "2", "3", "4"] as const;

export type BuilderTemplateId = (typeof BUILDER_TEMPLATE_IDS)[number];

export const DEFAULT_BUILDER_TEMPLATE_ID: BuilderTemplateId = "1";

export type BuilderTemplateInfo = {
  id: BuilderTemplateId
  name: string
  description: string
  sectionSummary: string
};

export const BUILDER_TEMPLATES: BuilderTemplateInfo[] = [
  {
    id: "1",
    name: "Template 1",
    description:
      "Full-screen welcome, three offers, a statement, six service boxes, before and after, quotes, numbers, then a form.",
    sectionSummary: "Edge-to-edge welcome · 3 columns · 6 boxes · quotes · form",
  },
  {
    id: "2",
    name: "Template 2",
    description:
      "Full-screen welcome, two programs, a service list beside the story, four steps, questions, map, then a form.",
    sectionSummary: "Welcome · 2 programs · 4 steps · questions · map · form",
  },
  {
    id: "3",
    name: "Template 3",
    description:
      "Full-screen photo welcome, three collections, photo-and-story rows, highlights, a visit row, then a form.",
    sectionSummary: "Welcome · 3 collections · photo rows · visit · form",
  },
  {
    id: "4",
    name: "Template 4",
    description:
      "Full-screen welcome, numbered services, a photo grid, quotes, three notes, then a form.",
    sectionSummary: "Welcome · 4 services · photo grid · quotes · form",
  },
];

export function isBuilderTemplateId(value: string): value is BuilderTemplateId {
  return (BUILDER_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function builderTemplateLabel(templateId: string | null | undefined): string {
  if (templateId === "blank") return "Blank page";
  if (templateId && isBuilderTemplateId(templateId)) {
    return BUILDER_TEMPLATES.find((template) => template.id === templateId)?.name ?? "Template 1";
  }
  return "Custom layout";
}

export function layoutForTemplate(templateId: string, input: BuilderBrandInput) {
  const id = isBuilderTemplateId(templateId) ? templateId : DEFAULT_BUILDER_TEMPLATE_ID;
  return rowsForTemplate(id, input);
}

export function themeForTemplate(_templateId: string): BuilderTheme {
  return { ...DEFAULT_BUILDER_THEME };
}

export function sectionsForTemplate(
  templateId: string,
  input: BuilderBrandInput,
): BuilderSectionDraft[] {
  let sortOrder = 0;
  return layoutForTemplate(templateId, input).flatMap((row) =>
    row.widgets.map((widget) => ({
      type: widget.type,
      visible: widget.visible,
      content: widget.content,
      sortOrder: sortOrder++,
    })),
  );
}
