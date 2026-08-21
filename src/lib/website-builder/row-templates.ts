import type { BuilderSectionContent, BuilderSectionType } from "@/lib/db/schema";
import type { RowContentWidth } from "@/lib/website-builder/layout";

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
  contentWidth?: RowContentWidth
  backgroundColor?: string
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

  if (templateId === "2") return templateTwo(name, offer, about);
  if (templateId === "3") return templateThree(name, offer, about);
  if (templateId === "4") return templateFour(name, offer, about, audience);
  return templateOne(name, offer, about, audience);
}

/** Dark full-bleed welcome, three offers, statement, six boxes, before/after, quotes, numbers. */
function templateOne(
  name: string,
  offer: string,
  about: string,
  audience: string,
): BuilderRowDraft[] {
  return [
    band(
      [
        hero(name, offer, {
          headingLevel: "h1",
          buttonLabel: "Let’s talk",
        }),
      ],
      { contentWidth: "full" },
    ),
    band(
      [
        text(
          0,
          "Offer",
          "Say what you do in a few words, and who it helps.",
          { headingLevel: "h3", linkLabel: "Get in touch", linkHref: "#lead" },
        ),
        text(
          1,
          "Reach",
          audience
            ? `This page is for ${audience}.`
            : "Say who this is for, in everyday words.",
          { headingLevel: "h3", linkLabel: "Get in touch", linkHref: "#lead" },
        ),
        text(
          2,
          "Follow-up",
          "A person from the business replies. Nothing is charged from this page.",
          { headingLevel: "h3", linkLabel: "Get in touch", linkHref: "#lead" },
        ),
      ],
      { columns: [34, 33, 33], contentWidth: "wide" },
    ),
    band(
      [
        text(0, about, "A clear message, shown when people are looking. Paste a photo on the welcome row if you want it edge to edge.", {
          headingLevel: "h2",
        }),
      ],
      { contentWidth: "narrow" },
    ),
    band(
      [
        text(0, "How we help you get there", "Six starting points. Change the words to match the work you actually do.", {
          headingLevel: "h2",
        }),
      ],
      { contentWidth: "wide" },
    ),
    band(
      [
        text(0, "Plan", "Who it is for, what to say, and where to show up.", {
          headingLevel: "h3",
          linkLabel: "I want a plan",
          linkHref: "#lead",
        }),
        text(1, "Digital presence", "A page and messages that look like the same business.", {
          headingLevel: "h3",
          linkLabel: "I want a stronger presence",
          linkHref: "#lead",
        }),
        text(2, "Enquiries", "Help the right people take the next step.", {
          headingLevel: "h3",
          linkLabel: "I want more enquiries",
          linkHref: "#lead",
        }),
      ],
      { columns: [34, 33, 33], contentWidth: "wide" },
    ),
    band(
      [
        text(0, "Community", "Give regulars a place to come back to.", {
          headingLevel: "h3",
          linkLabel: "I want a community",
          linkHref: "#lead",
        }),
        text(1, "New customers", "Reach people who do not know you yet.", {
          headingLevel: "h3",
          linkLabel: "I want new customers",
          linkHref: "#lead",
        }),
        text(2, "Visibility", "Be easy to find when someone is already looking.", {
          headingLevel: "h3",
          linkLabel: "I want to be found",
          linkHref: "#lead",
        }),
      ],
      { columns: [34, 33, 33], contentWidth: "wide" },
    ),
    band(
      [
        text(0, "Before", "People are not sure what you do.\nThe message is different in every place.\nEnquiries come in, then go quiet.", {
          headingLevel: "h2",
        }),
        text(1, "After", "The offer is easy to repeat.\nA person follows up.\nYou can see what brought someone here.", {
          headingLevel: "h2",
        }),
      ],
      { columns: [50, 50], contentWidth: "wide" },
    ),
    band(
      [
        {
          type: "features",
          columnIndex: 0,
          visible: true,
          content: {
            heading: "Selected work",
            headingLevel: "h2",
            body: "Replace these with real results. Keep the numbers honest.",
            items: [
              "Awareness | More of the right people recognize the name.",
              "Enquiries | More messages from people who are a fit.",
              "Follow-through | A person replies, so nothing sits in the inbox.",
            ].join("\n"),
          },
        },
      ],
      { contentWidth: "wide" },
    ),
    band(
      [
        {
          type: "testimonials",
          columnIndex: 0,
          visible: true,
          content: {
            heading: "What people say",
            headingLevel: "h2",
            items: [
              "A. Rivera | The process was clear from the first message.",
              "J. Patel | Questions got a real answer, not a canned reply.",
              "M. Chen | I knew what would happen next.",
            ].join("\n"),
          },
        },
      ],
      { contentWidth: "normal" },
    ),
    band(
      [
        text(0, "12+", "Businesses on a page like this", { headingLevel: "h1" }),
        text(1, "40+", "Projects finished", { headingLevel: "h1" }),
        text(2, "1M+", "Times the message was seen", { headingLevel: "h1" }),
        text(3, "2K+", "Enquiries started here", { headingLevel: "h1" }),
      ],
      { columns: [25, 25, 25, 25], contentWidth: "wide" },
    ),
    band(
      [
        {
          type: "cta",
          columnIndex: 0,
          visible: true,
          content: {
            heading: "Have a project in mind?",
            headingLevel: "h2",
            body: "Send a short message. A person from the business will follow up.",
            buttonLabel: "Let’s talk",
            buttonHref: "#lead",
          },
        },
      ],
      { contentWidth: "full" },
    ),
    band([leadWidget()], { contentWidth: "narrow" }),
  ];
}

/** Light professional welcome, two programs, service list, four steps, questions, map. */
function templateTwo(name: string, offer: string, about: string): BuilderRowDraft[] {
  return [
    band(
      [
        hero(name, offer, {
          headingLevel: "h1",
          buttonLabel: "Request information",
        }),
      ],
      { contentWidth: "full" },
    ),
    band(
      [
        text(0, "Program one", "A short, focused visit. Say how long it lasts and who it is for.", {
          headingLevel: "h2",
          linkLabel: "Ask about this",
          linkHref: "#lead",
        }),
        text(1, "Program two", "A longer path for people who want to go deeper. Add dates when you have them.", {
          headingLevel: "h2",
          linkLabel: "Ask about this",
          linkHref: "#lead",
        }),
      ],
      { columns: [50, 50], contentWidth: "wide" },
    ),
    band(
      [
        text(0, "What we do", about, { headingLevel: "h2" }),
        {
          type: "features",
          columnIndex: 1,
          visible: true,
          content: {
            heading: "How we can help",
            headingLevel: "h2",
            items: [
              "First visit | What happens when someone arrives.",
              "The work itself | What you actually do, in plain words.",
              "Aftercare | What the days after look like.",
              "Questions | How to ask before anyone commits.",
            ].join("\n"),
          },
        },
      ],
      { columns: [50, 50], contentWidth: "wide" },
    ),
    band(
      [
        text(0, "Prepare", "What to bring, and what to expect on the day.", { headingLevel: "h3" }),
        text(1, "The visit", "How long it takes, and who will be there.", { headingLevel: "h3" }),
        text(2, "Recovery", "What the next days usually look like.", { headingLevel: "h3" }),
        text(3, "Follow-up", "When you check in, and how to reach you.", { headingLevel: "h3" }),
      ],
      { columns: [25, 25, 25, 25], contentWidth: "wide" },
    ),
    band(
      [
        text(0, "Path A", "Two full days. Intended for people who want to see the work up close. Change this to match a real offering.", {
          headingLevel: "h2",
        }),
        text(1, "Path B", "A shorter look, offered when the calendar allows. Ask first — a person will reply.", {
          headingLevel: "h2",
        }),
      ],
      { columns: [50, 50], contentWidth: "wide" },
    ),
    band(
      [
        text(0, "Why this work matters", about, { headingLevel: "h2" }),
      ],
      { contentWidth: "narrow" },
    ),
    band(
      [
        {
          type: "faq",
          columnIndex: 0,
          visible: true,
          content: {
            heading: "Common questions",
            headingLevel: "h2",
            items: [
              "How do I get started? | Use the form on this page. A person will follow up.",
              "How long does a visit take? | Add the usual time here.",
              "What should I bring? | Add the details people ask you most often.",
              "Can I ask first? | Yes. Use the form and we will reply.",
            ].join("\n"),
          },
        },
      ],
      { contentWidth: "normal" },
    ),
    band(
      [
        {
          type: "map",
          columnIndex: 0,
          visible: true,
          content: {
            heading: "Find us",
            headingLevel: "h2",
            body: "Add the city or a landmark people will recognize.",
            mapQuery: "",
          },
        },
        {
          type: "hours",
          columnIndex: 1,
          visible: true,
          content: {
            heading: "Hours",
            headingLevel: "h2",
            items: [
              "Monday | By appointment",
              "Tuesday | By appointment",
              "Wednesday | By appointment",
              "Thursday | By appointment",
              "Friday | By appointment",
            ].join("\n"),
          },
        },
      ],
      { columns: [50, 50], contentWidth: "wide" },
    ),
    band(
      [
        {
          type: "call",
          columnIndex: 0,
          visible: true,
          content: {
            heading: "Call or message",
            headingLevel: "h2",
            body: "Add a phone number in this box if people should call.",
            buttonLabel: "Call",
          },
        },
        leadWidget(1),
      ],
      { columns: [50, 50], contentWidth: "wide" },
    ),
  ];
}

/** Editorial photo welcome, three categories, photo-and-story rows, highlights, visit. */
function templateThree(name: string, offer: string, about: string): BuilderRowDraft[] {
  return [
    band(
      [
        hero(name, offer, {
          headingLevel: "h1",
          buttonLabel: "Explore",
        }),
      ],
      { contentWidth: "full" },
    ),
    band(
      [
        text(0, "Collection one", "A short label for the first group of work.", {
          headingLevel: "h3",
          linkLabel: "View",
          linkHref: "#lead",
        }),
        text(1, "Collection two", "A short label for the second group.", {
          headingLevel: "h3",
          linkLabel: "View",
          linkHref: "#lead",
        }),
        text(2, "New", "What is new this season, or this month.", {
          headingLevel: "h3",
          linkLabel: "View",
          linkHref: "#lead",
        }),
      ],
      { columns: [34, 33, 33], contentWidth: "wide" },
    ),
    band(
      [
        imageLook(0),
        text(1, "The collection", about, { headingLevel: "h2" }),
      ],
      { columns: [50, 50], contentWidth: "wide" },
    ),
    band(
      [
        text(0, "The story", about, { headingLevel: "h2" }),
        imageLook(1),
      ],
      { columns: [50, 50], contentWidth: "wide" },
    ),
    band(
      [
        text(0, "Award", "A recognition you are proud of. Change the words.", { headingLevel: "h3" }),
        text(1, "Material", "What it is made of, in one line.", { headingLevel: "h3" }),
        text(2, "Place", "Where it is made, or where people can see it.", { headingLevel: "h3" }),
        text(3, "Care", "How it is meant to be used.", { headingLevel: "h3" }),
      ],
      { columns: [25, 25, 25, 25], contentWidth: "wide" },
    ),
    band(
      [
        imageLook(0),
        {
          type: "contact",
          columnIndex: 1,
          visible: true,
          content: {
            heading: "Visit",
            headingLevel: "h2",
            body: "Add a showroom, studio, or shop address. Or say you work by appointment.",
            buttonLabel: "Plan a visit",
            buttonHref: "#lead",
          },
        },
      ],
      { columns: [50, 50], contentWidth: "wide" },
    ),
    band(
      [
        text(0, "Note one", "A short story from the work. Replace this.", { headingLevel: "h3" }),
        text(1, "Note two", "A second story, or a new piece.", { headingLevel: "h3" }),
        text(2, "Note three", "A third story, or a place to visit.", { headingLevel: "h3" }),
      ],
      { columns: [34, 33, 33], contentWidth: "wide" },
    ),
    band([leadWidget()], { contentWidth: "narrow" }),
  ];
}

/** Agency welcome, numbered services, photo grid, quotes, three stories. */
function templateFour(
  name: string,
  offer: string,
  about: string,
  audience: string,
): BuilderRowDraft[] {
  return [
    band(
      [
        hero(name, offer, {
          headingLevel: "h1",
          buttonLabel: "Start a project",
        }),
      ],
      { contentWidth: "full" },
    ),
    band(
      [
        text(0, "Who we are", about, { headingLevel: "h2" }),
      ],
      { contentWidth: "normal" },
    ),
    band(
      [
        text(0, "20+", "Years of work", { headingLevel: "h1" }),
        text(1, "350+", "People helped", { headingLevel: "h1" }),
        text(2, "40+", "Awards and mentions", { headingLevel: "h1" }),
        text(3, "750+", "Projects finished", { headingLevel: "h1" }),
      ],
      { columns: [25, 25, 25, 25], contentWidth: "wide" },
    ),
    band(
      [
        text(0, "01  Design", "How it should look and feel.", { headingLevel: "h3" }),
        text(1, "02  Build", "Putting the pages and tools in place.", { headingLevel: "h3" }),
        text(2, "03  Reach", audience ? `Shown to ${audience}.` : "Getting the message in front of the right people.", {
          headingLevel: "h3",
        }),
        text(3, "04  Words", "The sentences people actually read.", { headingLevel: "h3" }),
      ],
      { columns: [25, 25, 25, 25], contentWidth: "wide" },
    ),
    band(
      [
        {
          type: "cta",
          columnIndex: 0,
          visible: true,
          content: {
            heading: "Save the back-and-forth",
            headingLevel: "h2",
            body: "Send a short note. A person replies with the next step.",
            buttonLabel: "Contact us",
            buttonHref: "#lead",
          },
        },
      ],
      { contentWidth: "full" },
    ),
    band(
      [
        {
          type: "gallery",
          columnIndex: 0,
          visible: true,
          content: {
            heading: "Selected work",
            headingLevel: "h2",
            items: "",
          },
        },
      ],
      { contentWidth: "wide" },
    ),
    band(
      [
        text(0, "How we think", "We look at the work, then the words, then where people will see it. Change this to your own process.", {
          headingLevel: "h2",
        }),
        {
          type: "button",
          columnIndex: 1,
          visible: true,
          content: {
            heading: "Let’s talk now",
            headingLevel: "h3",
            buttonLabel: "Start a project",
            buttonHref: "#lead",
          },
        },
      ],
      { columns: [66, 34], contentWidth: "wide" },
    ),
    band(
      [
        {
          type: "testimonials",
          columnIndex: 0,
          visible: true,
          content: {
            heading: "Kind words",
            headingLevel: "h2",
            items: [
              "A. Rivera | The process was clear from the first message.",
              "J. Patel | Questions got a real answer, not a canned reply.",
              "M. Chen | I knew what would happen next.",
            ].join("\n"),
          },
        },
      ],
      { contentWidth: "normal" },
    ),
    band(
      [
        text(0, "Note one", "A short story from recent work.", { headingLevel: "h3" }),
        text(1, "Note two", "A second story, or a method you use.", { headingLevel: "h3" }),
        text(2, "Note three", "A third story, or a result you can stand behind.", { headingLevel: "h3" }),
      ],
      { columns: [34, 33, 33], contentWidth: "wide" },
    ),
    band([leadWidget()], { contentWidth: "narrow" }),
  ];
}

function band(
  widgets: BuilderWidgetDraft[],
  options: {
    columns?: number[]
    contentWidth?: RowContentWidth
    backgroundColor?: string
  } = {},
): BuilderRowDraft {
  return {
    columnWidths: options.columns ?? [100],
    contentWidth: options.contentWidth ?? "normal",
    backgroundColor: options.backgroundColor ?? "",
    widgets,
  };
}

function widget(
  type: BuilderSectionType,
  columnIndex: number,
  content: BuilderSectionContent,
): BuilderWidgetDraft {
  return { type, columnIndex, visible: true, content };
}

function text(
  columnIndex: number,
  heading: string,
  body: string,
  extra: BuilderSectionContent = {},
): BuilderWidgetDraft {
  return widget("text", columnIndex, { heading, body, ...extra });
}

function hero(
  name: string,
  offer: string,
  extra: BuilderSectionContent = {},
): BuilderWidgetDraft {
  return widget("hero", 0, {
    heading: name,
    subheading: offer,
    buttonLabel: extra.buttonLabel || "Get in touch",
    buttonHref: "#lead",
    headingLevel: extra.headingLevel || "h1",
    imageUrl: "",
    imageAlt: "",
  });
}

function imageLook(columnIndex = 0): BuilderWidgetDraft {
  return widget("image_text", columnIndex, {
    heading: "Add a photo",
    headingLevel: "h3",
    body: "Paste a public https:// image link and a short caption.",
    imageUrl: "",
    imageAlt: "",
  });
}

function leadWidget(columnIndex = 0): BuilderWidgetDraft {
  return widget("lead", columnIndex, {
    heading: "Get in touch",
    headingLevel: "h2",
    body: "Share your name and email. This form is hosted by GroovGro.",
  });
}
