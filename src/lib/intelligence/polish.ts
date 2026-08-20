import {
  briefToPlainText,
  type IntelligenceBrief,
} from "@/lib/intelligence/observe";

export function isAiGatewayConfigured(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );
}

export async function polishBriefNarrative(
  brief: IntelligenceBrief,
): Promise<{ narrative: string; usedAi: boolean }> {
  const fallback = briefToPlainText(brief);
  if (!isAiGatewayConfigured()) {
    return { narrative: fallback, usedAi: false };
  }

  try {
    const { generateText } = await import("ai");
    const { text } = await generateText({
      model: "openai/gpt-5.4",
      instructions:
        "You write short, plain-language business summaries for GroovGro. Use only the provided facts. Do not invent numbers, people, or campaigns. Do not recommend sending email, buying ads, editing a website, charging a card, or changing Stripe webhooks. GroovGro observes and recommends only.",
      prompt: `Rewrite this intelligence brief for a non-technical owner in at most 8 short sentences.\n\n${fallback}`,
    });
    const narrative = text.trim();
    if (!narrative) return { narrative: fallback, usedAi: false };
    return { narrative, usedAi: true };
  } catch (error) {
    console.warn("GroovGro intelligence AI rewrite skipped", error);
    return { narrative: fallback, usedAi: false };
  }
}
