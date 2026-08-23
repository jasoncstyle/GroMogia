import { z } from "zod";

import { isAiGatewayConfigured } from "@/lib/intelligence/polish";
import {
  type InspiredCopy,
  type InspiredCopyFacts,
} from "@/lib/website-builder/inspired-copy";

const copySchema = z.object({
  heroHeading: z.string().trim().min(1).max(80),
  heroSubheading: z.string().trim().min(1).max(280),
  introHeading: z.string().trim().min(1).max(80),
  introBody: z.string().trim().min(1).max(400),
  topicBodies: z.array(z.string().trim().min(1).max(280)).max(8),
  featuresHeading: z.string().trim().min(1).max(80),
  featureItems: z.array(z.string().trim().min(1).max(240)).max(8),
  aboutHeading: z.string().trim().min(1).max(80),
  aboutBody: z.string().trim().min(1).max(480),
  faqItems: z.array(z.string().trim().min(1).max(320)).max(6),
  ctaHeading: z.string().trim().min(1).max(80),
  ctaBody: z.string().trim().min(1).max(280),
  leadHeading: z.string().trim().min(1).max(80),
  leadBody: z.string().trim().min(1).max(240),
  buttonLabel: z.string().trim().min(1).max(40),
});

function readJsonObject(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function polishInspiredCopy(
  copy: InspiredCopy,
  facts: InspiredCopyFacts,
): Promise<{ copy: InspiredCopy; usedAi: boolean }> {
  if (!isAiGatewayConfigured()) {
    return { copy, usedAi: false };
  }

  try {
    const { generateText } = await import("ai");
    const { text } = await generateText({
      model: "openai/gpt-5.4",
      instructions:
        "You write first-draft website copy for GroovGro. Use only the provided business facts and draft. Do not copy sentences from other websites. Do not invent prices, reviews, names, dates, or promises. Do not mention Stripe. Return only JSON that matches the draft keys.",
      prompt: [
        `Business name: ${facts.businessName || "this business"}`,
        facts.description ? `What they do: ${facts.description}` : "",
        facts.targetCustomers ? `Who they serve: ${facts.targetCustomers}` : "",
        facts.businessType ? `Kind of business: ${facts.businessType}` : "",
        facts.locations.length ? `Locations: ${facts.locations.join(", ")}` : "",
        facts.serviceAreas.length ? `Service areas: ${facts.serviceAreas.join(", ")}` : "",
        facts.notes ? `Owner notes: ${facts.notes}` : "",
        facts.inferredSummary ? `Confirmed summary: ${facts.inferredSummary}` : "",
        facts.offers.length
          ? `Confirmed offers:\n${facts.offers
              .map((offer) => `- ${offer.name}: ${offer.description || "no extra detail"}`)
              .join("\n")}`
          : "No confirmed offers yet.",
        facts.tone ? `Tone: ${facts.tone}` : "",
        facts.doSay ? `Do say: ${facts.doSay}` : "",
        facts.dontSay ? `Do not say: ${facts.dontSay}` : "",
        "Rewrite this first draft so a visitor could understand the business and send a note. Keep the same keys. Keep topic headings implied by topicBodies order. Keep FAQ items as `question | answer`. Keep feature items as `heading | body`.",
        JSON.stringify(copy),
      ]
        .filter(Boolean)
        .join("\n"),
    });
    const parsed = copySchema.safeParse(readJsonObject(text));
    if (!parsed.success) return { copy, usedAi: false };
    return { copy: parsed.data, usedAi: true };
  } catch (error) {
    console.warn("GroovGro website draft AI polish skipped", error);
    return { copy, usedAi: false };
  }
}
