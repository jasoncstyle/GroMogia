import { desc, eq } from "drizzle-orm";

import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { getGrowthLinkOptions } from "@/lib/growth/queries";
import { formatMoney } from "@/lib/money";
import { EventCreateForm } from "@/components/event-create-form";
import { hasPermission } from "@/lib/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function EventsPage() {
  const session = await getAppSession();
  const db = getDb();
  const rows =
    db && session.organizationId
      ? await db
          .select()
          .from(events)
          .where(eq(events.organizationId, session.organizationId))
          .orderBy(desc(events.startsAt))
      : [];
  const links = session.organizationId
    ? await getGrowthLinkOptions(session.organizationId)
    : { offers: [], goals: [] };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-muted-foreground">
          A generic calendar for classes, workshops, appointments, and other
          scheduled work. Industry labels can sit on top later. Do not create
          sailing-only tables.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add an event</CardTitle>
          <CardDescription>
            Use whatever type name fits the business: class, tour, workshop,
            appointment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventCreateForm
            offers={links.offers}
            goals={links.goals}
            disabled={!hasPermission(session.permissions, "manage_events")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events yet. Add the first one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Linked to</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-muted-foreground">
                        {event.eventType}
                        {event.location ? ` · ${event.location}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.startsAt ? event.startsAt.toLocaleString() : "Not set"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {links.offers.find((offer) => offer.id === event.offerId)?.name ??
                        links.goals.find((goal) => goal.id === event.goalId)?.title ??
                        "—"}
                    </TableCell>
                    <TableCell>{formatMoney(event.priceCents, event.currency)}</TableCell>
                    <TableCell>{event.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
