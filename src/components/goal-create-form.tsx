import { createGoal } from "@/lib/actions/growth";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GOAL_TYPES, labelFor } from "@/lib/growth/types";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function GoalCreateForm({
  offers,
  disabled,
}: {
  offers: { id: string; name: string }[]
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can add a Goal. GroovGro will not start marketing.
      </p>
    );
  }

  return (
    <SaveForm
      action={createGoal}
      successMessage="Goal saved"
      resetOnSuccess
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="title">What are we trying to accomplish?</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goalType">Type</Label>
        <select id="goalType" name="goalType" className={selectClassName} defaultValue="custom">
          {GOAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {labelFor(type)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <select id="priority" name="priority" className={selectClassName} defaultValue="normal">
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetMetric">Metric</Label>
        <Input id="targetMetric" name="targetMetric" placeholder="leads, sales, revenue" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="unit">Unit</Label>
        <Input id="unit" name="unit" placeholder="leads, customers, dollars" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="baselineValue">Starting number</Label>
        <Input id="baselineValue" name="baselineValue" type="number" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetValue">Target number</Label>
        <Input id="targetValue" name="targetValue" type="number" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currentValue">Current number</Label>
        <Input id="currentValue" name="currentValue" type="number" defaultValue="0" />
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
        <Label htmlFor="startsOn">Start</Label>
        <Input id="startsOn" name="startsOn" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="deadline">Deadline</Label>
        <Input id="deadline" name="deadline" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expectedRevenue">Expected value</Label>
        <Input id="expectedRevenue" name="expectedRevenue" placeholder="0.00" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="totalBudget">Budget</Label>
        <Input id="totalBudget" name="totalBudget" placeholder="0.00" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerSegment">Customer segment</Label>
        <Input id="customerSegment" name="customerSegment" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="successDefinition">What success looks like</Label>
        <Textarea id="successDefinition" name="successDefinition" rows={3} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Notes</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <SaveButton type="submit">Save goal</SaveButton>
    </SaveForm>
  );
}
