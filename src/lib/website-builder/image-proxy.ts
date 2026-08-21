import { isSafePublicHttpUrl } from "@/lib/seo/audit";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

export const MAX_BUILDER_IMAGE_BYTES = 6 * 1024 * 1024;

export function canProxyBuilderImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const url = isSafePublicHttpUrl(trimmed);
  if (!url || url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (host === "groovgro.com" || host.endsWith(".groovgro.com")) return false;
  return true;
}

export function builderDisplayImageSrc(url: string): string {
  const trimmed = url.trim();
  if (!canProxyBuilderImageUrl(trimmed)) return "";
  return `/api/builder-image?url=${encodeURIComponent(trimmed)}`;
}

export function isAllowedBuilderImageType(value: string | null): boolean {
  if (!value) return false;
  const type = value.split(";")[0]?.trim().toLowerCase() ?? "";
  return ALLOWED_TYPES.has(type);
}

export async function fetchPublicBuilderImage(url: string): Promise<Response> {
  let current = url.trim();
  for (let hop = 0; hop < 3; hop += 1) {
    if (!canProxyBuilderImageUrl(current)) {
      throw new Error("That image link is not allowed.");
    }
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.1",
        "User-Agent": "GroovGroImage/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("That image link redirected incorrectly.");
      current = new URL(location, current).toString();
      continue;
    }
    if (!response.ok) {
      throw new Error("That image could not be loaded.");
    }
    if (!isAllowedBuilderImageType(response.headers.get("content-type"))) {
      throw new Error("That link is not a photo file (jpg, png, gif, or webp).");
    }
    const length = Number(response.headers.get("content-length") ?? "0");
    if (length > MAX_BUILDER_IMAGE_BYTES) {
      throw new Error("That photo is too large.");
    }
    return response;
  }
  throw new Error("That image link redirected too many times.");
}
