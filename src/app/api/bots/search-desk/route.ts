import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { botAccessTokens } from "@/lib/db/schema";
import {
  hashBotAccessToken,
  readBotAccessToken,
  tokensMatch,
} from "@/lib/growth/bot-access";
import { getSearchDeskForBots } from "@/lib/growth/search-loop-query";

export async function GET(request: Request) {
  const token = readBotAccessToken(request);
  if (!token) {
    return Response.json(
      { error: "Add the desk token as a Bearer token. Do not log into Google." },
      { status: 401 },
    );
  }
  const db = getDb();
  if (!db) {
    return Response.json({ error: "Database is not configured." }, { status: 503 });
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
    return Response.json(
      { error: "That desk token is not valid." },
      { status: 401 },
    );
  }
  await db
    .update(botAccessTokens)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(botAccessTokens.id, row.id));
  const desk = await getSearchDeskForBots(row.organizationId);
  return Response.json(desk);
}
