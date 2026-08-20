import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  aiActionLogs,
  brandSettings,
  brandVoiceExamples,
  brandVoiceProfiles,
} from "@/lib/db/schema";

export async function getBrandVoicePageData(organizationId: string) {
  const db = getDb();
  if (!db) {
    return {
      brand: null,
      profile: null,
      examples: [] as (typeof brandVoiceExamples.$inferSelect)[],
      drafts: [] as { id: string; createdAt: Date; output: string }[],
    };
  }

  const [brand, profile, examples, drafts] = await Promise.all([
    db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.organizationId, organizationId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(brandVoiceProfiles)
      .where(eq(brandVoiceProfiles.organizationId, organizationId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(brandVoiceExamples)
      .where(eq(brandVoiceExamples.organizationId, organizationId))
      .orderBy(desc(brandVoiceExamples.createdAt)),
    db
      .select({
        id: aiActionLogs.id,
        createdAt: aiActionLogs.createdAt,
        output: aiActionLogs.output,
      })
      .from(aiActionLogs)
      .where(
        and(
          eq(aiActionLogs.organizationId, organizationId),
          eq(aiActionLogs.actionType, "brand_voice_draft"),
        ),
      )
      .orderBy(desc(aiActionLogs.createdAt))
      .limit(5),
  ]);

  return { brand, profile, examples, drafts };
}

export function readDraftOutput(output: string): {
  draft: string
  usedAi: boolean
  purpose: string
  topic: string
} | null {
  try {
    const parsed = JSON.parse(output) as {
      draft?: string
      usedAi?: boolean
      purpose?: string
      topic?: string
    };
    if (!parsed.draft) return null;
    return {
      draft: parsed.draft,
      usedAi: Boolean(parsed.usedAi),
      purpose: parsed.purpose ?? "",
      topic: parsed.topic ?? "",
    };
  } catch {
    return output ? { draft: output, usedAi: false, purpose: "", topic: "" } : null;
  }
}
