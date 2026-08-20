"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { writeBrandVoiceDraft } from "@/lib/brand-voice/generate";
import { isDraftPurpose } from "@/lib/brand-voice/draft";
import { getDb } from "@/lib/db";
import {
  aiActionLogs,
  brandSettings,
  brandVoiceExamples,
  brandVoiceProfiles,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const profileSchema = z.object({
  tone: z.string().trim().max(200).default(""),
  audience: z.string().trim().max(200).default(""),
  doSay: z.string().trim().max(2000).default(""),
  dontSay: z.string().trim().max(2000).default(""),
});

const exampleSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000),
  direction: z.enum(["more_like_this", "less_like_this"]),
});

function revalidateVoice() {
  revalidatePath("/app/brand-voice");
}

export async function saveBrandVoiceProfile(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the brand voice.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_brand")) {
      throw new Error("You do not have permission to manage brand voice.");
    }

    const parsed = profileSchema.parse({
      tone: formData.get("tone") ?? "",
      audience: formData.get("audience") ?? "",
      doSay: formData.get("doSay") ?? "",
      dontSay: formData.get("dontSay") ?? "",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    await db
      .insert(brandVoiceProfiles)
      .values({
        organizationId: session.organizationId,
        ...parsed,
      })
      .onConflictDoUpdate({
        target: brandVoiceProfiles.organizationId,
        set: { ...parsed, updatedAt: new Date() },
      });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "brand_voice.profile_saved",
      targetType: "brand_voice_profile",
      targetId: session.organizationId,
    });

    revalidateVoice();
    return "Brand voice saved";
  });
}

export async function addBrandVoiceExample(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the example.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_brand")) {
      throw new Error("You do not have permission to manage brand voice.");
    }

    const parsed = exampleSchema.parse({
      title: formData.get("title") ?? "",
      body: formData.get("body") ?? "",
      direction: formData.get("direction") ?? "more_like_this",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    await db.insert(brandVoiceExamples).values({
      organizationId: session.organizationId,
      title: parsed.title,
      body: parsed.body,
      direction: parsed.direction,
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "brand_voice.example_added",
      targetType: "brand_voice_example",
    });

    revalidateVoice();
    return parsed.direction === "more_like_this"
      ? "Example saved as more like this"
      : "Example saved as less like this";
  });
}

export async function removeBrandVoiceExample(formData: FormData): Promise<ActionResult> {
  return runAction("Could not remove the example.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_brand")) {
      throw new Error("You do not have permission to manage brand voice.");
    }

    const id = String(formData.get("exampleId") ?? "");
    if (!id) throw new Error("That example is missing.");

    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    await db
      .delete(brandVoiceExamples)
      .where(
        and(
          eq(brandVoiceExamples.id, id),
          eq(brandVoiceExamples.organizationId, session.organizationId),
        ),
      );

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "brand_voice.example_removed",
      targetType: "brand_voice_example",
      targetId: id,
    });

    revalidateVoice();
    return "Example removed";
  });
}

export async function generateBrandVoiceDraft(formData: FormData): Promise<ActionResult> {
  return runAction("Could not create the draft.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_brand")) {
      throw new Error("You do not have permission to manage brand voice.");
    }

    const purposeValue = String(formData.get("purpose") ?? "website_blurb");
    if (!isDraftPurpose(purposeValue)) {
      throw new Error("Choose a draft type.");
    }
    const topic = String(formData.get("topic") ?? "").trim();
    if (!topic) {
      throw new Error("Add a topic so the draft has something to say.");
    }

    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    const [brand] = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.organizationId, session.organizationId))
      .limit(1);
    const [profile] = await db
      .select()
      .from(brandVoiceProfiles)
      .where(eq(brandVoiceProfiles.organizationId, session.organizationId))
      .limit(1);
    const examples = await db
      .select()
      .from(brandVoiceExamples)
      .where(eq(brandVoiceExamples.organizationId, session.organizationId));

    const { draft, usedAi } = await writeBrandVoiceDraft({
      businessName: brand?.businessName || session.organizationName || "",
      description: brand?.description ?? "",
      targetCustomers: brand?.targetCustomers ?? "",
      tone: profile?.tone ?? "",
      audience: profile?.audience ?? "",
      doSay: profile?.doSay ?? "",
      dontSay: profile?.dontSay ?? "",
      examples: examples.map((example) => ({
        title: example.title,
        body: example.body,
        direction:
          example.direction === "less_like_this" ? "less_like_this" : "more_like_this",
      })),
      purpose: purposeValue,
      topic,
    });

    await db.insert(aiActionLogs).values({
      organizationId: session.organizationId,
      level: 3,
      actionType: "brand_voice_draft",
      inputSummary: `${purposeValue}: ${topic.slice(0, 120)}`,
      output: JSON.stringify({ draft, usedAi, purpose: purposeValue, topic }),
      status: "draft",
      actorUserId: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "brand_voice.draft_created",
      targetType: "ai_action_log",
      metadata: { usedAi, purpose: purposeValue },
    });

    revalidateVoice();
    return usedAi
      ? "Draft saved in GroovGro. It was not sent or published."
      : "Draft saved from your voice notes. It was not sent or published.";
  });
}
