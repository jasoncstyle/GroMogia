import type { BuilderSectionContent, BuilderSectionType } from "@/lib/db/schema";
import { isSafePublicHttpUrl } from "@/lib/seo/audit";

export const BUILDER_SECTION_TYPES = [
  "hero",
  "text",
  "cta",
  "lead",
  "image_text",
  "features",
  "testimonials",
  "faq",
  "contact",
] as const;

export const BUILDER_SECTION_LABELS: Record<BuilderSectionType, string> = {
  hero: "Hero",
  text: "Text",
  cta: "Call to action",
  lead: "Lead form",
  image_text: "Image + text",
  features: "Features",
  testimonials: "Testimonials",
  faq: "FAQ",
  contact: "Contact",
};

export const BUILDER_SECTION_HINTS: Record<BuilderSectionType, string> = {
  hero: "Large headline at the top of the page",
  text: "A heading and a paragraph",
  cta: "A short pitch with a button",
  lead: "A form that captures a name and email",
  image_text: "A photo next to words",
  features: "A list of what you offer",
  testimonials: "Quotes from customers",
  faq: "Questions and answers",
  contact: "How to get in touch",
};

export const MAX_BUILDER_ITEMS = 8;

export type BuilderSectionDraft = {
  type: BuilderSectionType
  sortOrder: number
  visible: boolean
  content: BuilderSectionContent
};

export type BuilderItem = {
  label: string
  detail: string
};

export function isBuilderSectionType(value: string): value is BuilderSectionType {
  return (BUILDER_SECTION_TYPES as readonly string[]).includes(value);
}

export function builderSectionLabel(type: string): string {
  if (isBuilderSectionType(type)) return BUILDER_SECTION_LABELS[type];
  return "Section";
}

export function isSafeBuilderHref(value: string): boolean {
  const href = value.trim();
  if (!href) return true;
  if (href.startsWith("#") && !href.startsWith("#/")) return href.length <= 80;
  if (href.startsWith("/") && !href.startsWith("//")) return href.length <= 500;
  if (href.toLowerCase().startsWith("mailto:")) {
    if (/\s|javascript:/i.test(href)) return false;
    return href.length <= 200;
  }
  if (href.toLowerCase().startsWith("tel:")) {
    return /^tel:\+?[0-9()\-\s.]{3,20}$/i.test(href);
  }
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeBuilderImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const url = isSafePublicHttpUrl(trimmed);
  return Boolean(url && url.protocol === "https:");
}

export function parseItemLines(raw: string, max = MAX_BUILDER_ITEMS): BuilderItem[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((line) => {
      const [label, ...rest] = line.split("|");
      return {
        label: clip(label, 80),
        detail: clip(rest.join("|"), 240),
      };
    })
    .filter((item) => item.label);
}

export function itemsToLines(items: BuilderItem[]): string {
  return items
    .map((item) => (item.detail ? `${item.label} | ${item.detail}` : item.label))
    .join("\n");
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

export function defaultContentForType(
  type: BuilderSectionType,
  title: string,
): BuilderSectionContent {
  if (type === "hero") {
    return {
      heading: title || "Your business",
      subheading: "Tell people what you do.",
      buttonLabel: "Get in touch",
      buttonHref: "#lead",
    };
  }
  if (type === "text") {
    return { heading: "New section", body: "Add your copy here." };
  }
  if (type === "cta") {
    return {
      heading: "Ready to start?",
      body: "Add your copy here.",
      buttonLabel: "Get in touch",
      buttonHref: "#lead",
    };
  }
  if (type === "lead") {
    return {
      heading: "Get in touch",
      body: "Share your name and email. This form is hosted by GroovGro.",
    };
  }
  if (type === "image_text") {
    return {
      heading: "See the work",
      body: "Add a short caption and paste an https image link.",
      imageUrl: "",
      imageAlt: "",
    };
  }
  if (type === "features") {
    return {
      heading: "What you can expect",
      items: [
        "Clear next step | People know what to do next.",
        "Human follow-up | A person replies to the form.",
      ].join("\n"),
    };
  }
  if (type === "testimonials") {
    return {
      heading: "What people say",
      items: "A. Rivera | The process was clear from the first message.",
    };
  }
  if (type === "faq") {
    return {
      heading: "Questions",
      items:
        "How do I get started? | Use the form on this page and a person will follow up.",
    };
  }
  return {
    heading: "Contact",
    body: "Send a message with the form, or use the button below.",
    buttonLabel: "Email us",
    buttonHref: "",
  };
}

export function parseBuilderSectionContent(
  type: BuilderSectionType,
  raw: BuilderSectionContent,
): BuilderSectionContent {
  const heading = clip(raw.heading, 120);
  const subheading = clip(raw.subheading, 240);
  const body = clipMultiline(raw.body, 4000);
  const buttonLabel = clip(raw.buttonLabel, 40);
  const buttonHref = clip(raw.buttonHref, 500);
  const imageUrl = clip(raw.imageUrl, 500);
  const imageAlt = clip(raw.imageAlt, 120);
  const items = itemsToLines(parseItemLines(raw.items ?? ""));

  if (buttonHref && !isSafeBuilderHref(buttonHref)) {
    throw new Error("Links must start with https://, mailto:, tel:, /, or #.");
  }
  if (imageUrl && !isSafeBuilderImageUrl(imageUrl)) {
    throw new Error("Image links must be public https:// addresses.");
  }

  if (type === "hero") {
    return { heading, subheading, buttonLabel, buttonHref, imageUrl, imageAlt };
  }
  if (type === "text") {
    return { heading, body };
  }
  if (type === "cta") {
    return { heading, body, buttonLabel, buttonHref };
  }
  if (type === "lead") {
    return { heading, body };
  }
  if (type === "image_text") {
    return { heading, body, imageUrl, imageAlt };
  }
  if (type === "features" || type === "testimonials" || type === "faq") {
    return { heading, body, items };
  }
  return { heading, body, buttonLabel, buttonHref };
}

export function publishedSectionsOnly<T extends { visible: boolean }>(
  sections: T[],
): T[] {
  return sections.filter((section) => section.visible);
}

function clip(value: string | undefined, max: number): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function clipMultiline(value: string | undefined, max: number): string {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}
