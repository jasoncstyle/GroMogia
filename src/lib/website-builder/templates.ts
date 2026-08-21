import type { BuilderSectionDraft } from "@/lib/website-builder/sections";
import {
  rowsForTemplate,
  type BuilderBrandInput,
} from "@/lib/website-builder/row-templates";

export type { BuilderBrandInput };

export const BUILDER_TEMPLATE_IDS = [
  "simple",
  "services",
  "local",
  "offer",
  "about",
  "story",
] as const;

export type BuilderTemplateId = (typeof BUILDER_TEMPLATE_IDS)[number];

export type BuilderTemplateInfo = {
  id: BuilderTemplateId
  name: string
  description: string
  sectionSummary: string
};

export const BUILDER_TEMPLATES: BuilderTemplateInfo[] = [
  {
    id: "simple",
    name: "Simple intro",
    description: "Welcome, a three-column row, then contact beside the form.",
    sectionSummary: "Full-width welcome · 3 columns · form beside a call to action",
  },
  {
    id: "services",
    name: "Services",
    description: "Three equal columns for what you offer, then a two-column story row.",
    sectionSummary: "Welcome · 3 columns · photo beside text · form",
  },
  {
    id: "local",
    name: "Local business",
    description: "Photo beside contact, then a three-column row for hours and access.",
    sectionSummary: "Welcome · 2 columns · 3 columns · form",
  },
  {
    id: "offer",
    name: "Offer or event",
    description: "Details beside questions, then three steps in one row.",
    sectionSummary: "Welcome · 2 columns · 3-step row · form",
  },
  {
    id: "about",
    name: "About and contact",
    description: "Story beside a photo, three quote columns, then contact beside the form.",
    sectionSummary: "Welcome · 2 columns · 3 columns · form",
  },
  {
    id: "story",
    name: "Story and FAQ",
    description: "A two-column photo row, three points, then questions.",
    sectionSummary: "Welcome · 2 columns · 3 columns · questions · form",
  },
];

export function isBuilderTemplateId(value: string): value is BuilderTemplateId {
  return (BUILDER_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function layoutForTemplate(templateId: string, input: BuilderBrandInput) {
  const id = isBuilderTemplateId(templateId) ? templateId : "simple";
  return rowsForTemplate(id, input);
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
