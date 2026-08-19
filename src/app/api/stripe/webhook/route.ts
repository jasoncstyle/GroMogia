import { getDb } from "@/lib/db";
import { ensureSchema } from "@/lib/db/ensure-schema";
import {
  constructSignedStripeEvent,
  getStripe,
  isStripeWebhookConfigured,
} from "@/modules/integrations/stripe";
import {
  ingestStripeEvent,
  resolveStripeOrganizationId,
} from "@/modules/integrations/stripe-ingest";
import {
  stripeMetadata,
  type StripeLikeObject,
} from "@/modules/integrations/stripe-normalize";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return Response.json(
      { ok: false, error: "Stripe webhook is not configured" },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return Response.json({ ok: false }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  const payload = await request.text();
  let event;
  try {
    event = constructSignedStripeEvent(stripe, payload, signature);
  } catch {
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  await ensureSchema();
  const db = getDb();
  if (!db) {
    return Response.json({ ok: false }, { status: 503 });
  }

  const object = event.data.object as unknown as StripeLikeObject;
  const organizationId = await resolveStripeOrganizationId(
    stripeMetadata(object.metadata),
  );

  if (!organizationId) {
    return Response.json({ ok: true, ignored: true, reason: "no_organization" });
  }

  await ingestStripeEvent(organizationId, event.type, object);
  return Response.json({ ok: true });
}
