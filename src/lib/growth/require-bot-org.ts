import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { botAccessTokens } from "@/lib/db/schema";
import {
  hashBotAccessToken,
  readBotAccessToken,
  tokensMatch,
} from "@/lib/growth/bot-access";

export async function requireBotOrganization(request: Request): Promise<
  | { ok: true; organizationId: string; tokenId: string }
  | { ok: false; status: number; error: string }
> {
  const token = readBotAccessToken(request);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Add the desk token as a Bearer token. Do not log into Google.",
    };
  }
  const db = getDb();
  if (!db) {
    return { ok: false, status: 503, error: "Database is not configured." };
  }
  const hash = hashBotAccessToken(token);
  const [row] = await db
    .select({
      id: botAccessTokens.id,
      organizationId: botAccessTokens.organizationId,
      tokenHash: botAccessTokens.tokenHash,
    })
    .from(botAccessTokens)
    .where(eq(botAccessTokens.tokenHash, hash))
    .limit(1);
  if (!row || !tokensMatch(token, row.tokenHash)) {
    return { ok: false, status: 401, error: "That desk token is not valid." };
  }
  await db
    .update(botAccessTokens)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(botAccessTokens.id, row.id));
  return { ok: true, organizationId: row.organizationId, tokenId: row.id };
}
