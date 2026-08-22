"use client";

import { useState } from "react";

import { builderDisplayImageSrc } from "@/lib/website-builder/image-proxy";
import { cn } from "@/lib/utils";

export function BuilderRemoteImage({
  url,
  alt,
  className,
  variant = "photo",
}: {
  url: string
  alt: string
  className?: string
  variant?: "photo" | "logo"
}) {
  const [failed, setFailed] = useState(false);
  const src = builderDisplayImageSrc(url);
  if (!src) return null;
  if (failed) {
    return (
      <p className="rounded-xl border border-dashed px-3 py-6 text-sm text-muted-foreground">
        GroovGro could not load this photo. Check that the link is a public
        https:// image file.
      </p>
    );
  }
  return (
    // Proxied through GroovGro so other sites cannot block the photo in Chrome.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(
        variant === "logo"
          ? "h-10 w-auto max-w-40 object-contain"
          : "min-h-40 w-full rounded-xl object-cover",
        className,
      )}
    />
  );
}
