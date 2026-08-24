import { updateBusinessBrain } from "@/lib/actions/growth";
import { commaTextFromList } from "@/lib/growth/types";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export type BusinessBrainValues = {
  industry?: string | null
  businessModel?: string | null
  locations?: string[] | null
  serviceAreas?: string[] | null
  operatingHours?: string | null
  seasonality?: string | null
  notes?: string | null
  discoveryStatus?: string | null
};

export function BusinessBrainForm({
  brain,
  disabled,
}: {
  brain?: BusinessBrainValues | null
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can save how this business works. GroovGro will not
        start marketing, send email, or edit the live website.
      </p>
    );
  }

  return (
    <SaveForm
      action={updateBusinessBrain}
      successMessage="Business saved"
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <Input
          id="industry"
          name="industry"
          defaultValue={brain?.industry ?? ""}
          placeholder="What kind of business is this?"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessModel">Business model</Label>
        <Input
          id="businessModel"
          name="businessModel"
          defaultValue={brain?.businessModel ?? ""}
          placeholder="How it makes money or creates value"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="locations">Locations</Label>
        <Input
          id="locations"
          name="locations"
          defaultValue={commaTextFromList(brain?.locations)}
          placeholder="Separate with commas"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="serviceAreas">Service areas</Label>
        <Input
          id="serviceAreas"
          name="serviceAreas"
          defaultValue={commaTextFromList(brain?.serviceAreas)}
          placeholder="Where customers come from"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="operatingHours">Operating hours</Label>
        <Textarea
          id="operatingHours"
          name="operatingHours"
          rows={3}
          defaultValue={brain?.operatingHours ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="seasonality">Seasonality</Label>
        <Input
          id="seasonality"
          name="seasonality"
          defaultValue={brain?.seasonality ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="discoveryStatus">How sure is this?</Label>
        <select
          id="discoveryStatus"
          name="discoveryStatus"
          className={selectClassName}
          defaultValue={brain?.discoveryStatus ?? "not_started"}
        >
          <option value="not_started">Not started</option>
          <option value="inferred">Inferred — still confirm</option>
          <option value="confirmed">Confirmed by the owner</option>
        </select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes and constraints</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={brain?.notes ?? ""}
          placeholder="Budget, staffing, compliance, or anything GroovGro should not ignore"
        />
      </div>
      <div className="md:col-span-2">
        <SaveButton type="submit">Save business</SaveButton>
      </div>
    </SaveForm>
  );
}
