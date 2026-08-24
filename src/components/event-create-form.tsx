import { createEvent } from "@/lib/actions/events";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function EventCreateForm({
  offers,
  goals,
  disabled,
}: {
  offers: { id: string; name: string }[]
  goals: { id: string; title: string }[]
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can add a calendar item. GroovGro will not change ads
        or the website.
      </p>
    );
  }

  return (
    <SaveForm
      action={createEvent}
      successMessage="Event saved. GroovGro did not change ads or the website."
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
          {offers.map((offer) => (
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
          {goals.map((goal) => (
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
      <SaveButton type="submit">Save event</SaveButton>
    </SaveForm>
  );
}
