/**
 * Read an owner-named public page when the host blocks GroovGro’s
 * first request. This is not search-engine discovery and does not
 * scrape Google.
 */
import {
  fetchPublicText,
  isUsableReadablePage,
  type FetchedText,
} from "@/lib/seo/fetch";
import { isSafePublicHttpUrl } from "@/lib/seo/audit";

export const NAMED_PAGE_READER_HOST = "r.jina.ai";

export function namedPageReaderUrl(pageUrl: string): URL | null {
  const parsed = isSafePublicHttpUrl(pageUrl);
  if (!parsed) return null;
  return new URL(`https://${NAMED_PAGE_READER_HOST}/${parsed.toString()}`);
}

export async function fetchNamedPublicPage(url: string): Promise<FetchedText> {
  const direct = await fetchPublicText(url);
  if (direct.ok && isUsableReadablePage(direct.body)) return direct;
  const reader = namedPageReaderUrl(url);
  if (!reader) return direct;
  const viaReader = await fetchPublicText(reader.toString());
  if (viaReader.ok && isUsableReadablePage(viaReader.body)) {
    return viaReader;
  }
  return direct.status ? direct : viaReader;
}
