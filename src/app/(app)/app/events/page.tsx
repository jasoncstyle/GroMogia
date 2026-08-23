import { desc, eq } from "drizzle-orm";

import { createEvent } from "@/lib/actions/events";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { getGrowthLinkOptions } from "@/lib/growth/queries";
import { formatMoney } from "@/lib/money";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

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
          <SaveForm
            action={createEvent}
            successMessage="Event saved"
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventType">Type</Label>
              <Input id="eventType" name="eventType" placeholder="class, workshop, appointment" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startsAt">Starts</Label>
              <Input id="startsAt" name="startsAt" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">Ends</Label>
              <Input id="endsAt" name="endsAt" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" name="capacity" type="number" min="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" name="price" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <select id="visibility" name="visibility" className={selectClassName} defaultValue="public">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" className={selectClassName} defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offerId">Related offer</Label>
              <select id="offerId" name="offerId" className={selectClassName} defaultValue="">
                <option value="">None</option>
                {links.offers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goalId">Related goal</Label>
              <select id="goalId" name="goalId" className={selectClassName} defaultValue="">
                <option value="">None</option>
                {links.goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="registrationUrl">Registration or booking link</Label>
              <Input id="registrationUrl" name="registrationUrl" placeholder="https://" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <SaveButton type="submit" disabled={!session.organizationId}>
              Save event
            </SaveButton>
          </SaveForm>
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
