import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const BOT_ACCESS_TOKEN_PREFIX = "ggbot_";

export function createBotAccessTokenValue(): string {
  return `${BOT_ACCESS_TOKEN_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function hashBotAccessToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function readBotAccessToken(request: {
  headers: { get(name: string): string | null }
}): string {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  if (bearer) return bearer;
  return (request.headers.get("x-groovgro-bot-token") ?? "").trim();
}

export function tokensMatch(token: string, hash: string): boolean {
  const actual = Buffer.from(hashBotAccessToken(token), "hex");
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length || actual.length === 0) return false;
  return timingSafeEqual(actual, expected);
}
