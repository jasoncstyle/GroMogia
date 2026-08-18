import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { attributionTouches, websites } from "@/lib/db/schema";

export async function POST(request: Request) {
  const db = getDb();
  if (!db) {
    return Response.json({ ok: false }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const trackingId = typeof body.trackingId === "string" ? body.trackingId : "";
  if (!trackingId) {
    return Response.json({ ok: false, error: "missing_tracking_id" }, { status: 400 });
  }

  const [website] = await db
    .select()
    .from(websites)
    .where(and(eq(websites.trackingId, trackingId), eq(websites.status, "active")))
    .limit(1);

  if (!website) {
    return Response.json({ ok: false }, { status: 404 });
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

  return Response.json({ ok: true });
}
