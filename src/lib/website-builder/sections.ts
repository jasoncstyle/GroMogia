import type { BuilderSectionContent, BuilderSectionType } from "@/lib/db/schema";

export const BUILDER_SECTION_TYPES = ["hero", "text", "cta", "lead"] as const;

export type BuilderSectionDraft = {
  type: BuilderSectionType
  sortOrder: number
  visible: boolean
  content: BuilderSectionContent
};

export function isBuilderSectionType(value: string): value is BuilderSectionType {
  return (BUILDER_SECTION_TYPES as readonly string[]).includes(value);
}

export function isSafeBuilderHref(value: string): boolean {
  const href = value.trim();
  if (!href) return true;
  if (href.startsWith("#") && !href.startsWith("#/")) return href.length <= 80;
  if (href.startsWith("/") && !href.startsWith("//")) return href.length <= 500;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function defaultBuilderSections(input: {
  businessName: string
  description: string
  targetCustomers: string
}): BuilderSectionDraft[] {
  const name = input.businessName.trim() || "Your business";
  const offer =
    input.description.trim() ||
    "Tell people what you do and how to get in touch.";
  const audience = input.targetCustomers.trim();

  return [
    {
      type: "hero",
      sortOrder: 0,
      visible: true,
      content: {
        heading: name,
        subheading: offer,
        buttonLabel: "Get in touch",
        buttonHref: "#lead",
      },
    },
    {
      type: "text",
      sortOrder: 1,
      visible: true,
      content: {
        heading: "What we do",
        body: audience
          ? `${offer} We work with ${audience}.`
          : offer,
      },
    },
    {
      type: "cta",
      sortOrder: 2,
      visible: true,
      content: {
        heading: "Ready to start?",
        body: "Send a short message. A person from the business will follow up.",
        buttonLabel: "Contact us",
        buttonHref: "#lead",
      },
    },
    {
      type: "lead",
      sortOrder: 3,
      visible: true,
      content: {
        heading: "Get in touch",
        body: "Share your name and email. This form is hosted by GroovGro.",
      },
    },
  ];
}

export function parseBuilderSectionContent(
  type: BuilderSectionType,
  raw: BuilderSectionContent,
): BuilderSectionContent {
  const heading = clip(raw.heading, 120);
  const subheading = clip(raw.subheading, 240);
  const body = clip(raw.body, 4000);
  const buttonLabel = clip(raw.buttonLabel, 40);
  const buttonHref = clip(raw.buttonHref, 500);
  if (buttonHref && !isSafeBuilderHref(buttonHref)) {
    throw new Error("Links must start with https://, /, or #.");
  }

  if (type === "hero") {
    return { heading, subheading, buttonLabel, buttonHref };
  }
  if (type === "text") {
    return { heading, body };
  }
  if (type === "cta") {
    return { heading, body, buttonLabel, buttonHref };
  }
  return { heading, body };
}

export function publishedSectionsOnly<T extends { visible: boolean }>(
  sections: T[],
): T[] {
  return sections.filter((section) => section.visible);
}

function clip(value: string | undefined, max: number): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
