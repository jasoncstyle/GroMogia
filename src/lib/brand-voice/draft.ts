export const DRAFT_PURPOSES = [
  "website_blurb",
  "follow_up_note",
  "social_post",
] as const;

export type DraftPurpose = (typeof DRAFT_PURPOSES)[number];

export type VoiceExample = {
  title: string
  body: string
  direction: "more_like_this" | "less_like_this"
};

export type VoiceDraftInput = {
  businessName: string
  description: string
  targetCustomers: string
  tone: string
  audience: string
  doSay: string
  dontSay: string
  examples: VoiceExample[]
  purpose: DraftPurpose
  topic: string
};

const PURPOSE_LABEL: Record<DraftPurpose, string> = {
  website_blurb: "short website blurb",
  follow_up_note: "follow-up note (not sent)",
  social_post: "social post (not published)",
};

export function purposeLabel(purpose: DraftPurpose): string {
  return PURPOSE_LABEL[purpose];
}

export function buildVoicePrompt(input: VoiceDraftInput): string {
  const more = input.examples.filter((example) => example.direction === "more_like_this");
  const less = input.examples.filter((example) => example.direction === "less_like_this");

  return [
    `Write a ${PURPOSE_LABEL[input.purpose]} for ${input.businessName || "this business"}.`,
    input.description ? `What the business does: ${input.description}` : "",
    input.targetCustomers ? `Who it serves: ${input.targetCustomers}` : "",
    input.tone ? `Tone: ${input.tone}` : "",
    input.audience ? `Audience: ${input.audience}` : "",
    input.doSay ? `Do say: ${input.doSay}` : "",
    input.dontSay ? `Do not say: ${input.dontSay}` : "",
    more.length
      ? `Write more like these approved examples:\n${more
          .map((example) => `- ${example.title}: ${example.body}`)
          .join("\n")}`
      : "No approved “more like this” examples yet.",
    less.length
      ? `Avoid sounding like these examples:\n${less
          .map((example) => `- ${example.title}: ${example.body}`)
          .join("\n")}`
      : "",
    `Topic: ${input.topic}`,
    "This is a draft only. Do not send email, publish to a website, post to social, charge a card, or change Stripe.",
    "Do not invent prices, reviews, or customer names.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function fallbackDraft(input: VoiceDraftInput): string {
  const more = input.examples.find((example) => example.direction === "more_like_this");
  const name = input.businessName || "this business";
  const tone = input.tone || "clear and professional";
  const audience = input.audience || input.targetCustomers || "the people this business already serves";
  const lines = [
    `${name} — ${PURPOSE_LABEL[input.purpose]}`,
    "",
    `This draft uses a ${tone} voice for ${audience}.`,
    input.topic.trim()
      ? `It is about: ${input.topic.trim()}`
      : "Add a topic so the next draft can be more specific.",
  ];

  if (input.doSay) {
    lines.push(`Keep this language: ${input.doSay}`);
  }
  if (input.dontSay) {
    lines.push(`Stay away from: ${input.dontSay}`);
  }
  if (more) {
    lines.push(`Shape it like the approved example “${more.title}.”`);
  } else {
    lines.push(
      "Save at least one “more like this” example so later drafts can match the real voice.",
    );
  }

  lines.push(
    "",
    "Draft only — GroovGro has not sent, posted, or published this. Stripe checkout is unchanged.",
  );
  return lines.join("\n");
}

export function isDraftPurpose(value: string): value is DraftPurpose {
  return (DRAFT_PURPOSES as readonly string[]).includes(value);
}
