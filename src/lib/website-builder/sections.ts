import type { BuilderSectionContent, BuilderSectionType } from "@/lib/db/schema";
import { isSafePublicHttpUrl } from "@/lib/seo/audit";
import { parseBuilderVideoEmbed, builderMapEmbedSrc, builderTelHref, builderWhatsAppHref } from "@/lib/website-builder/embeds";
import {
  isBuilderHeadingLevel,
  parseBuilderColor,
} from "@/lib/website-builder/style";

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
  "button",
  "image",
  "video",
  "gallery",
  "map",
  "pricing",
  "hours",
  "countdown",
  "social",
  "call",
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
  button: "Button",
  image: "Image",
  video: "Video",
  gallery: "Image grid",
  map: "Map",
  pricing: "Pricing",
  hours: "Hours",
  countdown: "Countdown",
  social: "Social links",
  call: "Call or message",
};

export const BUILDER_SECTION_HINTS: Record<BuilderSectionType, string> = {
  hero: "Large headline. Use Row width for an edge-to-edge photo",
  text: "A heading, paragraph, and optional link",
  cta: "A short pitch with a button",
  lead: "A form that captures a name and email",
  image_text: "A photo next to words",
  features: "A list of what you offer",
  testimonials: "Quotes from customers",
  faq: "Questions and answers",
  contact: "How to get in touch",
  button: "A single button people can click",
  image: "One photo",
  video: "A YouTube or Vimeo video",
  gallery: "Several photos in a grid",
  map: "A map for an address",
  pricing: "Plans or prices side by side",
  hours: "When you are open",
  countdown: "A date people can count down to",
  social: "Links to your profiles",
  call: "A call or WhatsApp button",
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
    return { heading: "New section", body: "Add your copy here.", headingLevel: "h2" };
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
  if (type === "button") {
    return { heading: "", buttonLabel: "Get in touch", buttonHref: "#lead" };
  }
  if (type === "image") {
    return { heading: "", imageUrl: "", imageAlt: "Photo" };
  }
  if (type === "video") {
    return { heading: "Watch", videoUrl: "" };
  }
  if (type === "gallery") {
    return { heading: "Photos", items: "" };
  }
  if (type === "map") {
    return { heading: "Find us", mapQuery: "" };
  }
  if (type === "pricing") {
    return {
      heading: "Plans",
      items: "Starter | Tell people what is included.\nStandard | Tell people what is included.",
    };
  }
  if (type === "hours") {
    return {
      heading: "Hours",
      items: "Weekdays | 9am–5pm\nWeekends | By appointment",
    };
  }
  if (type === "countdown") {
    return { heading: "Coming up", body: "Add a date people should remember.", endAt: "" };
  }
  if (type === "social") {
    return { heading: "Follow along", items: "" };
  }
  if (type === "call") {
    return {
      heading: "Talk with us",
      body: "Call or send a message. A person will answer.",
      buttonLabel: "Call",
      phone: "",
      whatsapp: "",
    };
  }
  return {
    heading: "Contact",
    body: "Send a message with the form, or use the button below.",
    buttonLabel: "Email us",
    buttonHref: "",
  };
}

export function contentFromFormData(formData: FormData): BuilderSectionContent {
  return {
    heading: String(formData.get("heading") ?? ""),
    subheading: String(formData.get("subheading") ?? ""),
    body: String(formData.get("body") ?? ""),
    buttonLabel: String(formData.get("buttonLabel") ?? ""),
    buttonHref: String(formData.get("buttonHref") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    imageAlt: String(formData.get("imageAlt") ?? ""),
    items: String(formData.get("items") ?? ""),
    headingLevel: String(formData.get("headingLevel") ?? ""),
    linkLabel: String(formData.get("linkLabel") ?? ""),
    linkHref: String(formData.get("linkHref") ?? ""),
    backgroundColor: String(formData.get("backgroundColor") ?? ""),
    textColor: String(formData.get("textColor") ?? ""),
    headingColor: String(formData.get("headingColor") ?? ""),
    videoUrl: String(formData.get("videoUrl") ?? ""),
    mapQuery: String(formData.get("mapQuery") ?? ""),
    endAt: String(formData.get("endAt") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
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
  const headingLevel = isBuilderHeadingLevel(raw.headingLevel ?? "")
    ? raw.headingLevel
    : "";
  const linkLabel = clip(raw.linkLabel, 80);
  const linkHref = clip(raw.linkHref, 500);
  const backgroundColor = parseBuilderColor(raw.backgroundColor);
  const textColor = parseBuilderColor(raw.textColor);
  const headingColor = parseBuilderColor(raw.headingColor);
  const videoUrl = clip(raw.videoUrl, 500);
  const mapQuery = clip(raw.mapQuery, 200);
  const endAt = parseCountdownEnd(raw.endAt);
  const phone = clip(raw.phone, 24);
  const whatsapp = clip(raw.whatsapp, 24);
  const look = {
    headingLevel,
    backgroundColor,
    textColor,
    headingColor,
  };

  if (buttonHref && !isSafeBuilderHref(buttonHref)) {
    throw new Error("Links must start with https://, mailto:, tel:, /, or #.");
  }
  if (linkHref && !isSafeBuilderHref(linkHref)) {
    throw new Error("Text links must start with https://, mailto:, tel:, /, or #.");
  }
  if (imageUrl && !isSafeBuilderImageUrl(imageUrl)) {
    throw new Error("Image links must be public https:// addresses.");
  }
  if (videoUrl && !parseBuilderVideoEmbed(videoUrl)) {
    throw new Error("Video links must be a public YouTube or Vimeo https:// address.");
  }
  if (mapQuery && !builderMapEmbedSrc(mapQuery)) {
    throw new Error("Add a short address or place name for the map.");
  }
  if (phone && !builderTelHref(phone)) {
    throw new Error("Add a phone number people can tap to call.");
  }
  if (whatsapp && !builderWhatsAppHref(whatsapp)) {
    throw new Error("WhatsApp needs a number with country code, digits only.");
  }
  if (type === "gallery") {
    for (const item of parseItemLines(items)) {
      if (item.label !== "https://" && !isSafeBuilderImageUrl(item.label)) {
        throw new Error("Each gallery line must start with a public https:// image.");
      }
    }
  }
  if (type === "social") {
    for (const item of parseItemLines(items)) {
      if (item.detail && item.detail !== "https://" && !isSafeBuilderHref(item.detail)) {
        throw new Error("Social links must start with https://.");
      }
    }
  }

  if (type === "hero") {
    return { ...look, heading, subheading, buttonLabel, buttonHref, imageUrl, imageAlt };
  }
  if (type === "text") {
    return { ...look, heading, body, linkLabel, linkHref };
  }
  if (type === "cta") {
    return { ...look, heading, body, buttonLabel, buttonHref };
  }
  if (type === "lead") {
    return { ...look, heading, body };
  }
  if (type === "image_text") {
    return { ...look, heading, body, imageUrl, imageAlt };
  }
  if (type === "features" || type === "testimonials" || type === "faq") {
    return { ...look, heading, body, items };
  }
  if (type === "button") {
    return { ...look, heading, buttonLabel, buttonHref };
  }
  if (type === "image") {
    return { ...look, heading, imageUrl, imageAlt };
  }
  if (type === "video") {
    return { ...look, heading, body, videoUrl };
  }
  if (type === "gallery") {
    return { ...look, heading, items };
  }
  if (type === "map") {
    return { ...look, heading, body, mapQuery };
  }
  if (type === "pricing" || type === "hours" || type === "social") {
    return { ...look, heading, body, items };
  }
  if (type === "countdown") {
    return { ...look, heading, body, endAt };
  }
  if (type === "call") {
    return { ...look, heading, body, buttonLabel, phone, whatsapp };
  }
  return { ...look, heading, body, buttonLabel, buttonHref };
}

function parseCountdownEnd(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error("Add a real date and time for the countdown.");
  }
  return new Date(parsed).toISOString();
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
