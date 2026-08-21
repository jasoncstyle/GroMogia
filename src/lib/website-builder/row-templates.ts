import type { BuilderSectionContent, BuilderSectionType } from "@/lib/db/schema";

export type BuilderBrandInput = {
  businessName: string
  description: string
  targetCustomers: string
};

export type BuilderWidgetDraft = {
  type: BuilderSectionType
  columnIndex: number
  visible: boolean
  content: BuilderSectionContent
};

export type BuilderRowDraft = {
  columnWidths: number[]
  widgets: BuilderWidgetDraft[]
};

export function rowsForTemplate(
  templateId: string,
  input: BuilderBrandInput,
): BuilderRowDraft[] {
  const name = input.businessName.trim() || "Your business";
  const offer =
    input.description.trim() ||
    "Tell people what you do and how to get in touch.";
  const audience = input.targetCustomers.trim();
  const about = audience ? `${offer} We work with ${audience}.` : offer;

  const id = templateId;

  if (id === "services") {
    return [
      fullHero(name, offer),
      threeColumnTexts(
        "What you get",
        "A clear picture of the work before anyone commits.",
        "How it works",
        "Send a short message. A person from the business follows up.",
        "What happens next",
        "We answer questions first. You decide if it is a fit.",
      ),
      twoColumn(
        imageLook(),
        text("How to start", about),
      ),
      row([50, 50], [cta(), leadWidget()]),
    ];
  }

  if (id === "local") {
    return [
      fullHero(name, offer),
      twoColumn(
        imageLook(),
        {
          type: "contact",
          columnIndex: 1,
          visible: true,
          content: {
            heading: "Visit or write",
            body: "Add hours, an address, or a phone number here.",
            buttonLabel: "Get in touch",
            buttonHref: "#lead",
          },
        },
      ),
      threeColumnTexts(
        "Find us",
        "Add the neighborhood or a landmark people will recognize.",
        "Hours",
        "Add when you are open, or say you work by appointment.",
        "Parking or access",
        "Add anything people should know before they arrive.",
      ),
      full(leadWidget()),
    ];
  }

  if (id === "offer") {
    return [
      fullHero(name, offer),
      twoColumn(
        text("What’s included", about),
        {
          type: "faq",
          columnIndex: 1,
          visible: true,
          content: {
            heading: "Common questions",
            items: [
              "How do I join? | Send a short message with the form. A person will follow up.",
              "What should I bring? | Add the details people ask you most often.",
              "Can I ask first? | Yes. Use the form and we will reply.",
            ].join("\n"),
          },
        },
      ),
      threeColumnTexts(
        "Step 1",
        "Tell us what you need in a short message.",
        "Step 2",
        "A person replies with the next step.",
        "Step 3",
        "You decide. Nothing is charged from this page.",
      ),
      full(cta()),
      full(leadWidget()),
    ];
  }

  if (id === "about") {
    return [
      fullHero(name, offer),
      twoColumn(text("Our story", about), imageLook()),
      threeColumnTexts(
        "A. Rivera",
        "The process was clear from the first message.",
        "J. Patel",
        "Questions got a real answer, not a canned reply.",
        "M. Chen",
        "I knew what would happen next.",
      ),
      row([50, 50], [
        {
          type: "contact",
          columnIndex: 0,
          visible: true,
          content: {
            heading: "Contact",
            body: "Send a message with the form, or add another way to reach you here.",
            buttonLabel: "Email us",
            buttonHref: "#lead",
          },
        },
        leadWidget(1),
      ]),
    ];
  }

  if (id === "story") {
    return [
      fullHero(name, offer),
      twoColumn(imageLook(), text("A closer look", about)),
      threeColumnTexts(
        "Straightforward",
        "We say what happens next.",
        "Personal reply",
        "A person answers the form.",
        "Room to ask",
        "Questions are welcome before anyone commits.",
      ),
      full({
        type: "faq",
        columnIndex: 0,
        visible: true,
        content: {
          heading: "Questions",
          items:
            "How do I get started? | Use the form on this page and a person will follow up.",
        },
      }),
      full(leadWidget()),
    ];
  }

  return [
    fullHero(name, offer),
    threeColumnTexts(
      "What we do",
      about,
      "Who it is for",
      audience
        ? `This page is for ${audience}.`
        : "Add who this is for, in everyday words.",
      "How to reach us",
      "Use the form. A person from the business will follow up.",
    ),
    row([50, 50], [cta(), leadWidget()]),
  ];
}

function widget(
  type: BuilderSectionType,
  columnIndex: number,
  content: BuilderSectionContent,
): BuilderWidgetDraft {
  return { type, columnIndex, visible: true, content };
}

function text(heading: string, body: string, columnIndex = 0): BuilderWidgetDraft {
  return widget("text", columnIndex, { heading, body });
}

function imageLook(columnIndex = 0): BuilderWidgetDraft {
  return widget("image_text", columnIndex, {
    heading: "Add a photo",
    body: "Paste a public https:// image link and a short caption.",
    imageUrl: "",
    imageAlt: "",
  });
}

function cta(columnIndex = 0): BuilderWidgetDraft {
  return widget("cta", columnIndex, {
    heading: "Ready to start?",
    body: "Send a short message. A person from the business will follow up.",
    buttonLabel: "Contact us",
    buttonHref: "#lead",
  });
}

function leadWidget(columnIndex = 0): BuilderWidgetDraft {
  return widget("lead", columnIndex, {
    heading: "Get in touch",
    body: "Share your name and email. This form is hosted by GroovGro.",
  });
}

function fullHero(name: string, offer: string): BuilderRowDraft {
  return full(
    widget("hero", 0, {
      heading: name,
      subheading: offer,
      buttonLabel: "Get in touch",
      buttonHref: "#lead",
    }),
  );
}

function full(item: BuilderWidgetDraft): BuilderRowDraft {
  return { columnWidths: [100], widgets: [{ ...item, columnIndex: 0 }] };
}

function twoColumn(left: BuilderWidgetDraft, right: BuilderWidgetDraft): BuilderRowDraft {
  return {
    columnWidths: [50, 50],
    widgets: [
      { ...left, columnIndex: 0 },
      { ...right, columnIndex: 1 },
    ],
  };
}

function threeColumnTexts(
  h1: string,
  b1: string,
  h2: string,
  b2: string,
  h3: string,
  b3: string,
): BuilderRowDraft {
  return {
    columnWidths: [34, 33, 33],
    widgets: [
      text(h1, b1, 0),
      text(h2, b2, 1),
      text(h3, b3, 2),
    ],
  };
}

function row(columnWidths: number[], widgets: BuilderWidgetDraft[]): BuilderRowDraft {
  return { columnWidths, widgets };
}
