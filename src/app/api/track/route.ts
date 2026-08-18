import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { attributionTouches, websites } from "@/lib/db/schema";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const db = getDb();
  if (!db) {
    return json({ ok: false }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const trackingId = typeof body.trackingId === "string" ? body.trackingId : "";
  if (!trackingId) {
    return json({ ok: false, error: "missing_tracking_id" }, 400);
  }

  const [website] = await db
    .select()
    .from(websites)
    .where(and(eq(websites.trackingId, trackingId), eq(websites.status, "active")))
    .limit(1);

  if (!website) {
    return json({ ok: false }, 404);
  }

  const utmSource = typeof body.utm_source === "string" ? body.utm_source : "";
  const referrer = typeof body.referrer === "string" ? body.referrer : "";
  let channel = typeof body.channel === "string" ? body.channel : "";
  if (!channel) {
    if (utmSource) channel = utmSource;
    else if (referrer) {
      try {
        channel = new URL(referrer).hostname || "referral";
      } catch {
        channel = "referral";
      }
    } else {
      channel = "direct";
    }
  }

  await db.insert(attributionTouches).values({
    organizationId: website.organizationId,
    sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
    channel,
    campaignId: typeof body.utm_campaign === "string" ? body.utm_campaign : null,
    landingPage: typeof body.landingPage === "string" ? body.landingPage : null,
    referrer: referrer || null,
    raw: {
      utm_source: utmSource || null,
      utm_medium: typeof body.utm_medium === "string" ? body.utm_medium : null,
      utm_campaign: typeof body.utm_campaign === "string" ? body.utm_campaign : null,
    },
  });

  return json({ ok: true });
}
