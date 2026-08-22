import { isSafePublicHttpUrl } from "@/lib/seo/audit";

export const MAX_MEDIA_ASSETS = 60;
export const MAX_MEDIA_BYTES = 6 * 1024 * 1024;

export const MEDIA_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
] as const;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export type MediaLibraryItem = {
  id: string
  publicUrl: string
  originalName: string
  createdAt: Date
};

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isAllowedMediaImageType(value: string | null | undefined): boolean {
  if (!value) return false;
  const type = value.split(";")[0]?.trim().toLowerCase() ?? "";
  return type in EXT_BY_TYPE;
}

export function extensionForMediaType(contentType: string, fileName = ""): string {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (EXT_BY_TYPE[type]) return EXT_BY_TYPE[type];
  const match = fileName.toLowerCase().match(/\.(jpe?g|png|gif|webp|avif)$/);
  return match?.[0] ?? "";
}

export function mediaBlobPathname(organizationId: string, contentType: string, fileName = ""): string {
  const ext = extensionForMediaType(contentType, fileName);
  if (!ext) throw new Error("Use a jpg, png, gif, or webp photo.");
  return `org/${organizationId}/builder/${crypto.randomUUID()}${ext}`;
}

export function isOrgMediaPathname(organizationId: string, pathname: string): boolean {
  const prefix = `org/${organizationId}/builder/`;
  if (!pathname.startsWith(prefix)) return false;
  const rest = pathname.slice(prefix.length);
  return /^[A-Za-z0-9._-]+$/.test(rest);
}

export function isVercelBlobImageUrl(value: string): boolean {
  const url = isSafePublicHttpUrl(value);
  if (!url || url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return host === "blob.vercel-storage.com" || host.endsWith(".blob.vercel-storage.com");
}

export function clipOriginalName(value: string): string {
  const name = value.replace(/[/\\]+/g, " ").replace(/\s+/g, " ").trim();
  if (!name) return "photo";
  return name.length <= 80 ? name : `${name.slice(0, 79).trimEnd()}…`;
}
