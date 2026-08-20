import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

function secretMaterial(): string {
  return process.env.INTEGRATION_TOKEN_KEY || process.env.GOOGLE_CLIENT_SECRET || "";
}

export function hasTokenEncryptionKey(): boolean {
  return secretMaterial().length >= 8;
}

function keyBytes(): Buffer {
  const secret = secretMaterial();
  if (secret.length < 8) {
    throw new Error("Add GOOGLE_CLIENT_SECRET in Vercel before connecting Google.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !dataPart) {
    throw new Error("Stored Google connection is unreadable. Disconnect and connect again.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyBytes(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function signOAuthState(payload: Record<string, string | number>): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", keyBytes()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readOAuthState(value: string): Record<string, string | number> {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) throw new Error("Google sign-in expired. Start connect again.");
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", keyBytes()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Google sign-in could not be verified. Start connect again.");
  }
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<
    string,
    string | number
  >;
}
