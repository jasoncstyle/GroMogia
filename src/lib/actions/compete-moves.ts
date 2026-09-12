"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { competeMoves } from "@/lib/db/schema";
import {
  planCompeteMove,
  planCompeteMoveDone,
  refuseDuplicateCompeteMoveTitle,
} from "@/lib/growth/compete-moves";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const moveSchema = z.object({
  title: z.string().trim().min(1).max(200),
  note: z.string().trim().max(2000).optional().default(""),
});

function revalidateCompeteMoves() {
  revalidatePath("/app/seo");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/next-step");
  revalidatePath("/app");
}

export async function createCompeteMove(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not save that compete move.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to save compete moves.");
    }
    const parsed = moveSchema.parse({
      title: formData.get("title") ?? "",
      note: formData.get("note") ?? "",
    });
    const draft = planCompeteMove({
      organizationId: session.organizationId,
      title: parsed.title,
      note: parsed.note,
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const existing = await db
      .select({ title: competeMoves.title })
      .from(competeMoves)
      .where(eq(competeMoves.organizationId, session.organizationId));
    refuseDuplicateCompeteMoveTitle(existing, draft.title);
    const [row] = await db
      .insert(competeMoves)
      .values({
        organizationId: session.organizationId,
        title: draft.title,
        note: draft.note,
        status: draft.status,
        source: draft.source,
        createdBy: session.userId,
      })
      .returning({ id: competeMoves.id });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "compete_move.created",
      targetType: "compete_move",
      targetId: row?.id ?? session.organizationId,
    });
    revalidateCompeteMoves();
    return "Compete move saved. GroovGro did not do this or change the live website.";
  });
}

const doneSchema = z.object({
  moveId: z.string().uuid(),
});

export async function completeCompeteMove(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not mark that compete move done.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to update compete moves.");
    }
    const parsed = doneSchema.parse({
      moveId: formData.get("moveId") ?? "",
    });
    const draft = planCompeteMoveDone({
      organizationId: session.organizationId,
      moveId: parsed.moveId,
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [row] = await db
      .update(competeMoves)
      .set({
        status: draft.status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(competeMoves.id, draft.moveId),
          eq(competeMoves.organizationId, session.organizationId),
        ),
      )
      .returning({ id: competeMoves.id });
    if (!row) {
      throw new Error("Pick a saved move first.");
    }
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "compete_move.done",
      targetType: "compete_move",
      targetId: row.id,
    });
    revalidateCompeteMoves();
    return "Marked as done. GroovGro did not do this or change the live website.";
  });
}
