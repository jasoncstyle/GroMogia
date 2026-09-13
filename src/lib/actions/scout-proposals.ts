"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { seoProposalItems } from "@/lib/db/schema";
import { recordScoutProposalPack } from "@/lib/growth/record-scout-pack";
import {
  SCOUT_STATUS_SHIPPED,
  nextScoutStatus,
  parseScoutProposalPack,
  type ScoutItemStatus,
} from "@/lib/growth/scout-proposals";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

function revalidateScoutInbox() {
  revalidatePath("/app/seo");
  revalidatePath("/app/next-step");
}

const packSchema = z.object({
  pack: z.string().trim().min(1).max(20000),
});

const decideSchema = z.object({
  itemId: z.string().uuid(),
  action: z.enum(["approve", "reject", "ship"]),
});

export async function saveScoutProposalPack(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that proposal pack.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to save SEO Scout proposals.");
    }
    const parsed = packSchema.parse({ pack: formData.get("pack") ?? "" });
    const pack = parseScoutProposalPack(parsed.pack);
    const saved = await recordScoutProposalPack({
      organizationId: session.organizationId,
      pack,
      actorUserId: session.userId,
      via: "paste",
    });
    return `Saved ${saved.count} SEO Scout proposal${saved.count === 1 ? "" : "s"} for ${pack.property}. Nothing was applied.`;
  });
}

export async function decideScoutProposal(formData: FormData): Promise<ActionResult> {
  return runAction("Could not update that proposal.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to review SEO Scout proposals.");
    }
    const parsed = decideSchema.parse({
      itemId: formData.get("itemId") ?? "",
      action: formData.get("action") ?? "",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [row] = await db
      .select({
        id: seoProposalItems.id,
        status: seoProposalItems.status,
      })
      .from(seoProposalItems)
      .where(
        and(
          eq(seoProposalItems.id, parsed.itemId),
          eq(seoProposalItems.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!row) throw new Error("That proposal was not found.");
    const next = nextScoutStatus(row.status as ScoutItemStatus, parsed.action);
    await db
      .update(seoProposalItems)
      .set({
        status: next,
        decidedBy: session.userId,
        shippedAt: next === SCOUT_STATUS_SHIPPED ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(seoProposalItems.id, row.id));
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: `scout_proposal.${parsed.action}`,
      targetType: "seo_proposal_item",
      targetId: row.id,
      metadata: { status: next },
    });
    revalidateScoutInbox();
    if (parsed.action === "ship") {
      return "Recorded as shipped after you applied it. GroovGro did not publish or patch the live site.";
    }
    if (parsed.action === "reject") {
      return "Proposal rejected. GroovGro did not apply it.";
    }
    return "Proposal approved. Apply it yourself, then mark shipped. GroovGro did not publish.";
  });
}
