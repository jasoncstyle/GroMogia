export type BuilderVideoEmbed = {
  provider: "youtube" | "vimeo"
  src: string
};

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

export function parseBuilderVideoEmbed(value: string): BuilderVideoEmbed | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
    return { provider: "youtube", src: `https://www.youtube.com/embed/${id}` };
  }
  if (YOUTUBE_HOSTS.has(host)) {
    const fromQuery = url.searchParams.get("v") ?? "";
    const fromPath = url.pathname.startsWith("/embed/")
      ? url.pathname.slice("/embed/".length).split("/")[0] ?? ""
      : url.pathname.startsWith("/shorts/")
        ? url.pathname.slice("/shorts/".length).split("/")[0] ?? ""
        : "";
    const id = fromQuery || fromPath;
    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
    return { provider: "youtube", src: `https://www.youtube.com/embed/${id}` };
  }
  if (VIMEO_HOSTS.has(host)) {
    const id = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    if (!/^[0-9]{6,12}$/.test(id)) return null;
    return { provider: "vimeo", src: `https://player.vimeo.com/video/${id}` };
  }
  return null;
}

export function builderMapEmbedSrc(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 200) return null;
  if (/javascript:|<|>/i.test(trimmed)) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`;
}

export function builderWhatsAppHref(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}

export function builderTelHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const compact = trimmed.replace(/[^\d+]/g, "");
  if (compact.replace(/\D/g, "").length < 7) return null;
  const href = compact.startsWith("+") ? `tel:${compact}` : `tel:${compact}`;
  return href.length <= 24 ? href : null;
}
