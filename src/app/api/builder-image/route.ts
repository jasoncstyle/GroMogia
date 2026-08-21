import { NextRequest } from "next/server";

import {
  canProxyBuilderImageUrl,
  fetchPublicBuilderImage,
  MAX_BUILDER_IMAGE_BYTES,
} from "@/lib/website-builder/image-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") ?? "";
  if (!canProxyBuilderImageUrl(url)) {
    return new Response("That image link is not allowed.", { status: 400 });
  }

  try {
    const upstream = await fetchPublicBuilderImage(url);
    const buffer = new Uint8Array(await upstream.arrayBuffer());
    if (buffer.byteLength > MAX_BUILDER_IMAGE_BYTES) {
      return new Response("That photo is too large.", { status: 413 });
    }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType.split(";")[0] ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("That image could not be loaded.", { status: 502 });
  }
}
