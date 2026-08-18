export type NormalizedStripePayment = {
  email: string | null
  displayName: string
  amountCents: number
  currency: string
  kind: "charge" | "deposit" | "refund"
  status: string
  providerObjectId: string
  bookingExternalId: string
  occurredAt: Date
  metadata: Record<string, string>
};

export type StripeLikeObject = {
  id: string
  object?: string
  amount?: number
  amount_total?: number
  amount_refunded?: number
  currency?: string
  customer_email?: string | null
  customer_details?: { email?: string | null; name?: string | null } | null
  billing_details?: { email?: string | null; name?: string | null } | null
  payment_status?: string | null
  status?: string | null
  created?: number
  metadata?: Record<string, string> | null
  payment_intent?: string | { id: string } | null
  card?: { number?: string; cvc?: string } | null
  source?: { number?: string; cvc?: string } | null
};

const FORBIDDEN_KEYS = [
  "number",
  "cvc",
  "cvv",
  "pan",
  "card_number",
  "exp_month",
  "exp_year",
];

export function stripeMetadata(
  metadata?: Record<string, string> | null,
): Record<string, string> {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([key, value]) =>
        !FORBIDDEN_KEYS.includes(key.toLowerCase()) && typeof value === "string",
    ),
  );
}

function paymentIntentId(
  paymentIntent: StripeLikeObject["payment_intent"],
): string | null {
  if (!paymentIntent) return null;
  if (typeof paymentIntent === "string") return paymentIntent;
  return paymentIntent.id ?? null;
}

function emailFrom(object: StripeLikeObject): string | null {
  const raw =
    object.customer_details?.email ||
    object.customer_email ||
    object.billing_details?.email ||
    null;
  const trimmed = raw?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function nameFrom(object: StripeLikeObject, email: string | null): string {
  const name =
    object.customer_details?.name?.trim() ||
    object.billing_details?.name?.trim();
  if (name) return name;
  if (email) return email.split("@")[0] ?? email;
  return "Stripe customer";
}

export function sanitizeStripePayment(
  payment: NormalizedStripePayment,
): NormalizedStripePayment {
  const json = JSON.stringify(payment).toLowerCase();
  for (const key of FORBIDDEN_KEYS) {
    if (json.includes(`"${key}"`)) {
      throw new Error("Stripe payload must not include card data");
    }
  }
  return payment;
}

export function normalizeStripeObject(
  eventType: string,
  object: StripeLikeObject,
): NormalizedStripePayment | null {
  if (eventType === "checkout.session.completed") {
    const email = emailFrom(object);
    return sanitizeStripePayment({
      email,
      displayName: nameFrom(object, email),
      amountCents: object.amount_total ?? 0,
      currency: object.currency ?? "usd",
      kind: "charge",
      status: object.payment_status ?? object.status ?? "paid",
      providerObjectId: object.id,
      bookingExternalId: object.id,
      occurredAt: new Date((object.created ?? 0) * 1000),
      metadata: stripeMetadata(object.metadata),
    });
  }

  if (eventType === "charge.succeeded" || eventType === "payment_intent.succeeded") {
    const email = emailFrom(object);
    return sanitizeStripePayment({
      email,
      displayName: nameFrom(object, email),
      amountCents: object.amount ?? 0,
      currency: object.currency ?? "usd",
      kind: "charge",
      status: object.status ?? "succeeded",
      providerObjectId: object.id,
      bookingExternalId: paymentIntentId(object.payment_intent) ?? object.id,
      occurredAt: new Date((object.created ?? 0) * 1000),
      metadata: stripeMetadata(object.metadata),
    });
  }

  if (eventType === "charge.refunded") {
    const email = emailFrom(object);
    return sanitizeStripePayment({
      email,
      displayName: nameFrom(object, email),
      amountCents: object.amount_refunded ?? object.amount ?? 0,
      currency: object.currency ?? "usd",
      kind: "refund",
      status: "refunded",
      providerObjectId: `${object.id}:refund`,
      bookingExternalId: paymentIntentId(object.payment_intent) ?? object.id,
      occurredAt: new Date((object.created ?? 0) * 1000),
      metadata: stripeMetadata(object.metadata),
    });
  }

  return null;
}
