import http from "node:http";
import https from "node:https";

import { isSafePublicHttpUrl } from "@/lib/seo/audit";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 5;
export const MAX_HTML_BYTES = 750_000;

const IDENTIFY_HEADERS = {
  "user-agent": "GroovGroSEO/1.0 (+https://www.groovgro.com)",
  accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.8",
};

const COMPATIBLE_HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; GroovGro/1.0; +https://www.groovgro.com)",
  accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

export type FetchedText = {
  ok: boolean
  status: number
  body: string
};

export function isChallengeHtml(html: string): boolean {
  return /just a moment|attention required|cf-browser-verification|checking your browser|enable javascript and cookies to continue|verify you are human/i.test(
    html,
  );
}

export function isUsablePublicHtml(html: string): boolean {
  const text = html.trim();
  if (text.length < 40) return false;
  if (isChallengeHtml(text)) return false;
  return /<title[\s>]|<h1[\s>]|<meta\s/i.test(text);
}

export function isUsableReadablePage(text: string): boolean {
  if (isUsablePublicHtml(text)) return true;
  const trimmed = text.trim();
  if (isChallengeHtml(trimmed)) return false;
  if (/^Title:\s+\S/m.test(trimmed) || /^#{1,3}\s+\S/m.test(trimmed)) {
    return trimmed.length >= 20;
  }
  return false;
}

export function explainPublicFetchFailure(fetched: FetchedText): string {
  if (fetched.status === 403 || fetched.status === 401 || fetched.status === 429) {
    return "This website blocked the automated read. Open it in your browser, paste the public page, and try Read this website again. GroovGro did not search Google.";
  }
  if (fetched.status === 404) {
    return "That page was not found. Check the address. GroovGro did not search Google.";
  }
  if (isChallengeHtml(fetched.body)) {
    return "This website asked for a human check before showing the page. GroovGro did not search Google.";
  }
  if (fetched.status === 0) {
    return "GroovGro could not reach that website. Check the address. It did not search Google.";
  }
  return "GroovGro could not read that public page. Check the address. It did not search Google.";
}

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
      if (done) break;
      if (!value || value.byteLength === 0) continue;
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

function finalizePublicFetch(responseUrl: string, status: number, body: string): FetchedText {
  if (responseUrl) {
    const finalUrl = isSafePublicHttpUrl(responseUrl);
    if (!finalUrl) {
      return { ok: false, status, body: "" };
    }
  }
  const usable = isUsableReadablePage(body);
  return {
    ok: (status >= 200 && status < 400 && Boolean(body.trim()) && !isChallengeHtml(body) && usable) || usable,
    status,
    body: usable || body.trim() ? body : "",
  };
}

function requestWithNode(
  url: URL,
  headers: Record<string, string>,
  redirects = 0,
): Promise<FetchedText> {
  return new Promise((resolve) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        family: 4,
        timeout: FETCH_TIMEOUT_MS,
        headers,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location && redirects < MAX_REDIRECTS) {
          res.resume();
          let next: URL;
          try {
            next = new URL(location, url);
          } catch {
            resolve({ ok: false, status, body: "" });
            return;
          }
          if (!isSafePublicHttpUrl(next.toString())) {
            resolve({ ok: false, status, body: "" });
            return;
          }
          resolve(requestWithNode(next, headers, redirects + 1));
          return;
        }
        const chunks: Buffer[] = [];
        let received = 0;
        res.on("data", (chunk) => {
          if (received >= MAX_HTML_BYTES) return;
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          const take = buf.subarray(0, MAX_HTML_BYTES - received);
          chunks.push(take);
          received += take.length;
          if (received >= MAX_HTML_BYTES) req.destroy();
        });
        res.on("end", () => {
          resolve(finalizePublicFetch(url.toString(), status, Buffer.concat(chunks).toString("utf8")));
        });
        res.on("error", () => resolve({ ok: false, status, body: "" }));
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 0, body: "" });
    });
    req.on("error", () => resolve({ ok: false, status: 0, body: "" }));
    req.end();
  });
}

async function attemptPublicFetch(
  parsed: URL,
  headers: Record<string, string>,
): Promise<FetchedText> {
  try {
    const response = await fetch(parsed.toString(), {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers,
    });
    const body = await readCappedResponseText(response);
    return finalizePublicFetch(response.url, response.status, body);
  } catch {
    return { ok: false, status: 0, body: "" };
  }
}

export async function fetchPublicText(url: string): Promise<FetchedText> {
  const parsed = isSafePublicHttpUrl(url);
  if (!parsed) {
    return { ok: false, status: 0, body: "" };
  }

  const first = await attemptPublicFetch(parsed, IDENTIFY_HEADERS);
  if (first.ok) return first;

  const second = await attemptPublicFetch(parsed, COMPATIBLE_HEADERS);
  if (second.ok) return second;

  const viaNode = await requestWithNode(parsed, COMPATIBLE_HEADERS);
  if (viaNode.ok) return viaNode;

  return viaNode.status ? viaNode : second.status ? second : first;
}

export function originFromWebsiteUrl(websiteUrl: string): URL | null {
  const parsed = isSafePublicHttpUrl(websiteUrl);
  if (!parsed) return null;
  return new URL(`${parsed.protocol}//${parsed.host}`);
}
