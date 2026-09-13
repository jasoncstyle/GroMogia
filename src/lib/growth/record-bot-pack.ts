import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { botProposalItems, botProposalPacks } from "@/lib/db/schema";
import {
  isBotSeatLive,
  parkedBotSeatMessage,
  type BotProposalPack,
} from "@/lib/growth/bot-team";

export async function recordBotProposalPack(input: {
  organizationId: string
  pack: BotProposalPack
  actorUserId?: string | null
  via: "handoff" | "paste"
}): Promise<{ packId: string; count: number }> {
  if (!isBotSeatLive(input.pack.seat)) {
    throw new Error(parkedBotSeatMessage(input.pack.seat));
  }
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const [saved] = await db
    .insert(botProposalPacks)
    .values({
      organizationId: input.organizationId,
      seat: input.pack.seat,
      property: input.pack.property,
      source: input.pack.source,
      sourceRange: input.pack.sourceRange,
      createdBy: input.actorUserId ?? null,
    })
    .returning({ id: botProposalPacks.id });
  if (!saved) throw new Error("Could not save that proposal pack.");
  await db.insert(botProposalItems).values(
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
      input.via === "handoff" ? "bot_proposal.handoff" : "bot_proposal.saved",
    targetType: "bot_proposal_pack",
    targetId: saved.id,
    metadata: {
      seat: input.pack.seat,
      property: input.pack.property,
      items: input.pack.items.length,
      via: input.via,
    },
  });
  revalidatePath("/app");
  revalidatePath("/app/bot-team");
  revalidatePath("/app/integrations");
  return { packId: saved.id, count: input.pack.items.length };
}
