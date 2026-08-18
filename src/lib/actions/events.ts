"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { dollarsToCents } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const eventSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional().default(""),
  eventType: z.string().trim().max(80).optional().default("event"),
  location: z.string().trim().max(200).optional().default(""),
  startsAt: z.string().optional().default(""),
  endsAt: z.string().optional().default(""),
  capacity: z.string().optional().default(""),
  price: z.string().optional().default(""),
  registrationUrl: z.string().trim().max(500).optional().default(""),
  visibility: z.enum(["public", "private"]).optional().default("public"),
  status: z.enum(["draft", "scheduled", "completed", "cancelled"]).optional().default("draft"),
});

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createEvent(formData: FormData) {
  const session = await requireOrgSession();
  if (!hasPermission(session.permissions, "manage_events")) {
    throw new Error("You do not have permission to manage events.");
  }

  const parsed = eventSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    eventType: formData.get("eventType") ?? "event",
    location: formData.get("location") ?? "",
    startsAt: formData.get("startsAt") ?? "",
    endsAt: formData.get("endsAt") ?? "",
    capacity: formData.get("capacity") ?? "",
    price: formData.get("price") ?? "",
    registrationUrl: formData.get("registrationUrl") ?? "",
    visibility: formData.get("visibility") ?? "public",
    status: formData.get("status") ?? "draft",
  });

  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const eventId = crypto.randomUUID();
  await db.insert(events).values({
    id: eventId,
    organizationId: session.organizationId,
    title: parsed.title,
    description: parsed.description,
    eventType: parsed.eventType || "event",
    location: parsed.location,
    startsAt: parseDate(parsed.startsAt),
    endsAt: parseDate(parsed.endsAt),
    capacity: parsed.capacity ? Number.parseInt(parsed.capacity, 10) : null,
    priceCents: parsed.price ? dollarsToCents(parsed.price) : 0,
    registrationUrl: parsed.registrationUrl,
    visibility: parsed.visibility,
    status: parsed.status,
  });

  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "event.created",
    targetType: "event",
    targetId: eventId,
  });

  revalidatePath("/app/events");
  revalidatePath("/app");
}
