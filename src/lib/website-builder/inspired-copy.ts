export type InspiredOfferInput = {
  name: string
  description: string
};

export type InspiredCopyFacts = {
  businessName: string
  description: string
  targetCustomers: string
  businessType: string
  locations: string[]
  serviceAreas: string[]
  notes: string
  inferredSummary: string
  offers: InspiredOfferInput[]
  topics: string[]
  questions: string[]
  tone?: string
  doSay?: string
  dontSay?: string
  operatingHours?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  socialLinks?: { label: string; url: string }[]
};

export type InspiredCopy = {
  heroHeading: string
  heroSubheading: string
  introHeading: string
  introBody: string
  topicBodies: string[]
  featuresHeading: string
  featureItems: string[]
  aboutHeading: string
  aboutBody: string
  faqItems: string[]
  ctaHeading: string
  ctaBody: string
  leadHeading: string
  leadBody: string
  buttonLabel: string
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function firstSentence(value: string): string {
  const text = clean(value);
  if (!text) return "";
  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1] : text;
}

function listPhrase(values: string[]): string {
  const items = values.map(clean).filter(Boolean);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function offerForTopic(
  topic: string,
  offers: InspiredOfferInput[],
): InspiredOfferInput | undefined {
  const key = topic.toLowerCase();
  return offers.find((offer) => {
    const name = offer.name.toLowerCase();
    return name === key || name.includes(key) || key.includes(name);
  });
}

function topicSentence(topic: string, facts: InspiredCopyFacts): string {
  const offer = offerForTopic(topic, facts.offers);
  if (offer?.description) {
    return clip(`${offer.description}`, 220);
  }
  const what = firstSentence(facts.description);
  if (what) {
    return clip(`${what} Ask about ${topic} when you get in touch.`, 220);
  }
  const name = clean(facts.businessName) || "this business";
  return clip(`${name} can talk with you about ${topic}. Use the form on this page to start.`, 220);
}

export function draftInspiredCopy(facts: InspiredCopyFacts): InspiredCopy {
  const name = clean(facts.businessName) || "Your business";
  const description = clean(facts.description);
  const audience = clean(facts.targetCustomers);
  const type = clean(facts.businessType);
  const places = listPhrase([...(facts.locations ?? []), ...(facts.serviceAreas ?? [])]);
  const extra = clean(facts.notes) || clean(facts.inferredSummary);
  const offers = facts.offers.filter((offer) => clean(offer.name));
  const topics = facts.topics.map(clean).filter(Boolean);
  const questions = facts.questions.map(clean).filter(Boolean);

  const heroSubheading =
    description ||
    (audience
      ? `${name} works with ${audience}.`
      : type
        ? `${name} is a ${type} business. Get in touch to learn more.`
        : `Welcome to ${name}. Get in touch to learn more.`);

  const introHeading = type ? `A ${type} business` : "What we do";
  const introParts = [
    description || `${name} is ready to help.`,
    audience ? `This page is for ${audience}.` : "",
    "A person from the business replies. Nothing is charged from this page.",
  ];

  const featureSource =
    offers.length > 0
      ? offers.slice(0, 6).map((offer) => ({
          heading: offer.name,
          body: clean(offer.description) || firstSentence(description) || `Ask ${name} about ${offer.name}.`,
        }))
      : topics.slice(0, 6).map((topic) => ({
          heading: topic,
          body: topicSentence(topic, facts),
        }));

  const aboutParts = [
    description || heroSubheading,
    audience ? `We work with ${audience}.` : "",
    places ? `We serve ${places}.` : "",
    extra && extra !== description ? extra : "",
  ];

  const faqItems = questions.slice(0, 4).map((question) => {
    const answer = [
      `Send a note through the form on this page and someone from ${name} will follow up.`,
      firstSentence(description),
      audience ? `We work with ${audience}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `${question} | ${clip(answer, 240)}`;
  });

  return {
    heroHeading: name,
    heroSubheading: clip(heroSubheading, 220),
    introHeading,
    introBody: clip(introParts.filter(Boolean).join(" "), 320),
    topicBodies: topics.map((topic) => topicSentence(topic, facts)),
    featuresHeading: offers.length > 0 ? "What we offer" : "What people come for",
    featureItems: featureSource.map((item) => `${item.heading} | ${clip(item.body, 180)}`),
    aboutHeading: `About ${name}`,
    aboutBody: clip(aboutParts.filter(Boolean).join(" "), 400),
    faqItems,
    ctaHeading: "Ready to talk?",
    ctaBody: clip(
      `Tell ${name} what you need. A person from the business replies. This GroovGro page does not charge a card.`,
      220,
    ),
    leadHeading: "Get in touch",
    leadBody: clip(
      `Share your name and email. Someone from ${name} will follow up. This form is hosted by GroovGro.`,
      200,
    ),
    buttonLabel: "Get in touch",
  };
}
