import type { BuilderSectionDraft } from "@/lib/website-builder/sections";
import { defaultBuilderSections } from "@/lib/website-builder/sections";

export const BUILDER_TEMPLATE_IDS = [
  "simple",
  "services",
  "local",
  "offer",
  "about",
  "story",
] as const;

export type BuilderTemplateId = (typeof BUILDER_TEMPLATE_IDS)[number];

export type BuilderBrandInput = {
  businessName: string
  description: string
  targetCustomers: string
};

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
    description: "A short welcome, what you do, and a contact form.",
    sectionSummary: "Welcome, about, call to action, form",
  },
  {
    id: "services",
    name: "Services",
    description: "List what people can expect, then invite a message.",
    sectionSummary: "Welcome, features, about, call to action, form",
  },
  {
    id: "local",
    name: "Local business",
    description: "A photo area, contact details, and a form for visits or questions.",
    sectionSummary: "Welcome, photo + text, contact, form",
  },
  {
    id: "offer",
    name: "Offer or event",
    description: "Explain the offer, answer common questions, then collect replies.",
    sectionSummary: "Welcome, details, questions, call to action, form",
  },
  {
    id: "about",
    name: "About and contact",
    description: "Tell the story, show what people say, and how to reach you.",
    sectionSummary: "Welcome, about, testimonials, contact, form",
  },
  {
    id: "story",
    name: "Story and FAQ",
    description: "A longer page with a photo, features, and questions.",
    sectionSummary: "Welcome, photo + text, features, questions, form",
  },
];

export function isBuilderTemplateId(value: string): value is BuilderTemplateId {
  return (BUILDER_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function sectionsForTemplate(
  templateId: string,
  input: BuilderBrandInput,
): BuilderSectionDraft[] {
  const id = isBuilderTemplateId(templateId) ? templateId : "simple";
  const name = input.businessName.trim() || "Your business";
  const offer =
    input.description.trim() ||
    "Tell people what you do and how to get in touch.";
  const audience = input.targetCustomers.trim();
  const about = audience ? `${offer} We work with ${audience}.` : offer;

  if (id === "simple") {
    return defaultBuilderSections(input);
  }

  if (id === "services") {
    return withOrder([
      hero(name, offer),
      {
        type: "features",
        visible: true,
        content: {
          heading: "What you can expect",
          items: [
            "Clear next step | People know what happens after they write.",
            "Human follow-up | A person from the business replies.",
            "Plain language | We explain the offer in everyday words.",
          ].join("\n"),
        },
      },
      {
        type: "text",
        visible: true,
        content: { heading: "How it works", body: about },
      },
      cta(),
      lead(),
    ]);
  }

  if (id === "local") {
    return withOrder([
      hero(name, offer),
      {
        type: "image_text",
        visible: true,
        content: {
          heading: "Come see us",
          body: "Paste a public https:// photo here, then add a short caption about the place or the work.",
          imageUrl: "",
          imageAlt: "",
        },
      },
      {
        type: "contact",
        visible: true,
        content: {
          heading: "Visit or write",
          body: "Add hours, an address, or a phone number here. You can also use the form below.",
          buttonLabel: "Get in touch",
          buttonHref: "#lead",
        },
      },
      lead(),
    ]);
  }

  if (id === "offer") {
    return withOrder([
      hero(name, offer),
      {
        type: "text",
        visible: true,
        content: {
          heading: "What’s included",
          body: about,
        },
      },
      {
        type: "faq",
        visible: true,
        content: {
          heading: "Common questions",
          items: [
            "How do I join? | Send a short message with the form. A person will follow up.",
            "What should I bring? | Add the details people ask you most often.",
            "Can I ask a question first? | Yes. Use the form and we will reply.",
          ].join("\n"),
        },
      },
      cta(),
      lead(),
    ]);
  }

  if (id === "about") {
    return withOrder([
      hero(name, offer),
      {
        type: "text",
        visible: true,
        content: { heading: "Our story", body: about },
      },
      {
        type: "testimonials",
        visible: true,
        content: {
          heading: "What people say",
          items: "A. Rivera | The process was clear from the first message.",
        },
      },
      {
        type: "contact",
        visible: true,
        content: {
          heading: "Contact",
          body: "Send a message with the form, or add another way to reach you here.",
          buttonLabel: "Email us",
          buttonHref: "#lead",
        },
      },
      lead(),
    ]);
  }

  return withOrder([
    hero(name, offer),
    {
      type: "image_text",
      visible: true,
      content: {
        heading: "A closer look",
        body: "Paste a public https:// photo and a short caption. This section is a good place for the work, the place, or the people.",
        imageUrl: "",
        imageAlt: "",
      },
    },
    {
      type: "features",
      visible: true,
      content: {
        heading: "Why people choose us",
        items: [
          "Straightforward | We say what happens next.",
          "Personal reply | A person answers the form.",
          "Room to ask | Questions are welcome before anyone commits.",
        ].join("\n"),
      },
    },
    {
      type: "faq",
      visible: true,
      content: {
        heading: "Questions",
        items:
          "How do I get started? | Use the form on this page and a person will follow up.",
      },
    },
    lead(),
  ]);
}

function hero(name: string, offer: string): Omit<BuilderSectionDraft, "sortOrder"> {
  return {
    type: "hero",
    visible: true,
    content: {
      heading: name,
      subheading: offer,
      buttonLabel: "Get in touch",
      buttonHref: "#lead",
    },
  };
}

function cta(): Omit<BuilderSectionDraft, "sortOrder"> {
  return {
    type: "cta",
    visible: true,
    content: {
      heading: "Ready to start?",
      body: "Send a short message. A person from the business will follow up.",
      buttonLabel: "Contact us",
      buttonHref: "#lead",
    },
  };
}

function lead(): Omit<BuilderSectionDraft, "sortOrder"> {
  return {
    type: "lead",
    visible: true,
    content: {
      heading: "Get in touch",
      body: "Share your name and email. This form is hosted by GroovGro.",
    },
  };
}

function withOrder(
  sections: Omit<BuilderSectionDraft, "sortOrder">[],
): BuilderSectionDraft[] {
  return sections.map((section, sortOrder) => ({ ...section, sortOrder }));
}
