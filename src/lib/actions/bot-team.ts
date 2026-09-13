"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { botProposalItems, botProposalPacks } from "@/lib/db/schema";
import { recordBotProposalPack } from "@/lib/growth/record-bot-pack";
import {
  BOT_SEATS,
  BOT_STATUS_SHIPPED,
  describeBotSeat,
  nextBotStatus,
  parseBotProposalPack,
  type BotItemStatus,
  type BotSeat,
} from "@/lib/growth/bot-team";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const packSchema = z.object({
  seat: z.enum(BOT_SEATS),
  pack: z.string().trim().min(1).max(24000),
});

const decideSchema = z.object({
  itemId: z.string().uuid(),
  action: z.enum(["approve", "reject", "ship"]),
});

function canReviewBots(permissions: string[]): boolean {
  return (
    hasPermission(permissions, "manage_integrations") ||
    hasPermission(permissions, "manage_seo")
  );
}

function revalidateBotInbox() {
  revalidatePath("/app");
  revalidatePath("/app/bot-team");
  revalidatePath("/app/integrations");
}

export async function saveBotProposalPack(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that proposal pack.", async () => {
    const session = await requireOrgSession();
    if (!canReviewBots(session.permissions)) {
      throw new Error("You do not have permission to save bot proposals.");
    }
    const parsed = packSchema.parse({
      seat: formData.get("seat") ?? "",
      pack: formData.get("pack") ?? "",
    });
    const pack = parseBotProposalPack(parsed.pack, parsed.seat as BotSeat);
    const saved = await recordBotProposalPack({
      organizationId: session.organizationId,
      pack,
      actorUserId: session.userId,
      via: "paste",
    });
    const name = describeBotSeat(pack.seat).name;
    return `Saved ${saved.count} ${name} proposal${saved.count === 1 ? "" : "s"} for ${pack.property}. Nothing was sent or published.`;
  });
}

export async function decideBotProposal(formData: FormData): Promise<ActionResult> {
  return runAction("Could not update that proposal.", async () => {
    const session = await requireOrgSession();
    if (!canReviewBots(session.permissions)) {
      throw new Error("You do not have permission to review bot proposals.");
    }
    const parsed = decideSchema.parse({
      itemId: formData.get("itemId") ?? "",
      action: formData.get("action") ?? "",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [row] = await db
      .select({
        id: botProposalItems.id,
        status: botProposalItems.status,
        seat: botProposalPacks.seat,
      })
      .from(botProposalItems)
      .innerJoin(botProposalPacks, eq(botProposalItems.packId, botProposalPacks.id))
      .where(
        and(
          eq(botProposalItems.id, parsed.itemId),
          eq(botProposalItems.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!row) throw new Error("That proposal was not found.");
    const next = nextBotStatus(row.status as BotItemStatus, parsed.action);
    await db
      .update(botProposalItems)
      .set({
        status: next,
        decidedBy: session.userId,
        shippedAt: next === BOT_STATUS_SHIPPED ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(botProposalItems.id, row.id));
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: `bot_proposal.${parsed.action}`,
      targetType: "bot_proposal_item",
      targetId: row.id,
      metadata: { status: next, seat: row.seat },
    });
    revalidateBotInbox();
    const name = describeBotSeat(row.seat as BotSeat).name;
    if (parsed.action === "ship") {
      if (row.seat === "booksgro") {
        return `Recorded as used. GroovGro did not move money or change QuickBooks.`;
      }
      if (row.seat === "draftgro") {
        return `Recorded as used. GroovGro did not send or post.`;
      }
      return `Recorded as used. GroovGro did not publish.`;
    }
    if (parsed.action === "reject") {
      return `${name} proposal rejected. GroovGro did not apply it.`;
    }
    return `${name} proposal approved. You still send, paste, or file it. GroovGro did not.`;
  });
}
