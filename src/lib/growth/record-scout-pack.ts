import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { seoProposalItems, seoProposalPacks } from "@/lib/db/schema";
import type { ScoutProposalPack } from "@/lib/growth/scout-proposals";

export async function recordScoutProposalPack(input: {
  organizationId: string
  pack: ScoutProposalPack
  actorUserId?: string | null
  via: "handoff" | "paste"
}): Promise<{ packId: string; count: number }> {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const [saved] = await db
    .insert(seoProposalPacks)
    .values({
      organizationId: input.organizationId,
      property: input.pack.property,
      source: input.pack.source,
      sourceRange: input.pack.sourceRange,
      createdBy: input.actorUserId ?? null,
    })
    .returning({ id: seoProposalPacks.id });
  if (!saved) throw new Error("Could not save that proposal pack.");
  await db.insert(seoProposalItems).values(
    input.pack.items.map((item) => ({
      organizationId: input.organizationId,
      packId: saved.id,
      externalId: item.id,
      type: item.type,
      priority: item.priority,
      evidence: item.evidence,
      draft: item.draft,
      expectedEffect: item.expectedEffect,
      status: item.status,
      createdBy: input.actorUserId ?? null,
    })),
  );
  await recordAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    action:
      input.via === "handoff" ? "scout_proposal.handoff" : "scout_proposal.saved",
    targetType: "seo_proposal_pack",
    targetId: saved.id,
    metadata: {
      property: input.pack.property,
      items: input.pack.items.length,
      via: input.via,
    },
  });
  revalidatePath("/app/seo");
  revalidatePath("/app/next-step");
  return { packId: saved.id, count: input.pack.items.length };
}
