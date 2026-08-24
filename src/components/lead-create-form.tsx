import { createLead } from "@/lib/actions/crm";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function LeadCreateForm({
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
        An owner or admin can add a person. GroovGro will not email anyone.
      </p>
    );
  }

  return (
    <SaveForm
      action={createLead}
      successMessage="Lead saved"
      resetOnSuccess
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="space-y-2">
        <Label htmlFor="displayName">Name</Label>
        <Input id="displayName" name="displayName" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="source">Source</Label>
        <Input id="source" name="source" placeholder="website, phone, referral" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="estimatedValue">Estimated value (optional)</Label>
        <Input id="estimatedValue" name="estimatedValue" placeholder="0.00" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="offerId">Related offer</Label>
        <select
          id="offerId"
          name="offerId"
          className={selectClassName + " w-full"}
          defaultValue=""
        >
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
        <select
          id="goalId"
          name="goalId"
          className={selectClassName + " w-full"}
          defaultValue=""
        >
          <option value="">None</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      <div className="md:col-span-2">
        <SaveButton type="submit">Save as new lead</SaveButton>
      </div>
    </SaveForm>
  );
}
