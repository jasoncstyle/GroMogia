"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { fail, runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { botAccessTokens } from "@/lib/db/schema";
import {
  createBotAccessTokenValue,
  hashBotAccessToken,
} from "@/lib/growth/bot-access";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

function revalidateBotAccess() {
  revalidatePath("/app/integrations");
  revalidatePath("/app/seo");
}

export async function createBotAccessToken(): Promise<ActionResult> {
  try {
    const session = await requireOrgSession();
    if (
      !hasPermission(session.permissions, "manage_integrations") &&
      !hasPermission(session.permissions, "manage_seo")
    ) {
      throw new Error("You do not have permission to create a bot token.");
    }
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const token = createBotAccessTokenValue();
    await db.insert(botAccessTokens).values({
      organizationId: session.organizationId,
      tokenHash: hashBotAccessToken(token),
      label: "search desk",
    });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "bot_access_token.created",
      targetType: "bot_access_token",
    });
    revalidateBotAccess();
    return {
      ok: true,
      message: "Copy this token now. GroovGro will not show it again.",
      token,
    };
  } catch (error) {
    return fail(error, "Could not create that bot token.");
  }
}

export async function revokeBotAccessTokens(): Promise<ActionResult> {
  return runAction("Could not revoke bot tokens.", async () => {
    const session = await requireOrgSession();
    if (
      !hasPermission(session.permissions, "manage_integrations") &&
      !hasPermission(session.permissions, "manage_seo")
    ) {
      throw new Error("You do not have permission to revoke bot tokens.");
    }
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    await db
      .delete(botAccessTokens)
      .where(eq(botAccessTokens.organizationId, session.organizationId));
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "bot_access_token.revoked",
      targetType: "bot_access_token",
    });
    revalidateBotAccess();
    return "Bot tokens revoked. Search partner and Goal checker can no longer read the desk.";
  });
}
