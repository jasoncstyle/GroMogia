import { isSafePublicHttpUrl } from "@/lib/seo/audit";

const FETCH_TIMEOUT_MS = 10_000;
export const MAX_HTML_BYTES = 750_000;

export type FetchedText = {
  ok: boolean
  status: number
  body: string
};

export async function readCappedResponseText(
  response: Response,
  maxBytes = MAX_HTML_BYTES,
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    return text.length > maxBytes ? text.slice(0, maxBytes) : text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remaining = maxBytes - received;
      if (value.byteLength > remaining) {
        chunks.push(value.slice(0, remaining));
        received += remaining;
        break;
      }
      chunks.push(value);
      received += value.byteLength;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // The body may already be closed after a short page.
    }
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

export async function fetchPublicText(url: string): Promise<FetchedText> {
  const parsed = isSafePublicHttpUrl(url);
  if (!parsed) {
    return { ok: false, status: 0, body: "" };
  }

  try {
    const response = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "user-agent": "GroovGroSEO/1.0 (+https://www.groovgro.com)",
        accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const finalUrl = isSafePublicHttpUrl(response.url);
    if (!finalUrl) {
      return { ok: false, status: response.status, body: "" };
    }
    const body = await readCappedResponseText(response);
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 0, body: "" };
  }
}

export function originFromWebsiteUrl(websiteUrl: string): URL | null {
  const parsed = isSafePublicHttpUrl(websiteUrl);
  if (!parsed) return null;
  return new URL(`${parsed.protocol}//${parsed.host}`);
}
