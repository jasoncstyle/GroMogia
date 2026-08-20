import { isSafePublicHttpUrl } from "@/lib/seo/audit";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 750_000;

export type FetchedText = {
  ok: boolean
  status: number
  body: string
};

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
    const buffer = await response.arrayBuffer();
    const slice = buffer.byteLength > MAX_HTML_BYTES ? buffer.slice(0, MAX_HTML_BYTES) : buffer;
    const body = new TextDecoder("utf-8", { fatal: false }).decode(slice);
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
