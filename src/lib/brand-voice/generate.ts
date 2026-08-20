import {
  buildVoicePrompt,
  fallbackDraft,
  type VoiceDraftInput,
} from "@/lib/brand-voice/draft";
import { isAiGatewayConfigured } from "@/lib/intelligence/polish";

export async function writeBrandVoiceDraft(
  input: VoiceDraftInput,
): Promise<{ draft: string; usedAi: boolean }> {
  const fallback = fallbackDraft(input);
  if (!isAiGatewayConfigured()) {
    return { draft: fallback, usedAi: false };
  }

  try {
    const { generateText } = await import("ai");
    const { text } = await generateText({
      model: "openai/gpt-5.4",
      instructions:
        "You write short marketing drafts that match a business voice. Use only the provided profile and examples. Do not invent prices, reviews, or names. Do not send, publish, post, charge a card, or change Stripe. Return only the draft text.",
      prompt: buildVoicePrompt(input),
    });
    const draft = text.trim();
    if (!draft) return { draft: fallback, usedAi: false };
    return { draft, usedAi: true };
  } catch (error) {
    console.warn("GroovGro brand voice AI draft skipped", error);
    return { draft: fallback, usedAi: false };
  }
}
