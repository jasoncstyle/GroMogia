import { updateGrowthSettings } from "@/lib/actions/growth";
import { REVIEW_FREQUENCIES, WEEKDAYS, labelFor } from "@/lib/growth/types";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export type GrowthSettingsValues = {
  reviewFrequency?: string | null
  reviewDay?: string | null
  reviewTime?: string | null
  timezone?: string | null
};

export function GrowthSettingsForm({
  settings,
  disabled,
}: {
  settings?: GrowthSettingsValues | null
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can save when you look at this week&apos;s numbers.
        GroovGro will not change the business then.
      </p>
    );
  }

  return (
    <SaveForm
      action={updateGrowthSettings}
      successMessage="Review schedule saved. GroovGro did not change the business."
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="space-y-2">
        <Label htmlFor="reviewFrequency">How often</Label>
        <select
          id="reviewFrequency"
          name="reviewFrequency"
          className={selectClassName}
          defaultValue={settings?.reviewFrequency ?? "weekly"}
        >
          {REVIEW_FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {labelFor(frequency)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reviewDay">Day</Label>
        <select
          id="reviewDay"
          name="reviewDay"
          className={selectClassName}
          defaultValue={settings?.reviewDay ?? "monday"}
        >
          {WEEKDAYS.map((day) => (
            <option key={day} value={day}>
              {labelFor(day)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reviewTime">Time</Label>
        <Input
          id="reviewTime"
          name="reviewTime"
          type="time"
          defaultValue={settings?.reviewTime ?? "10:00"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input
          id="timezone"
          name="timezone"
          defaultValue={settings?.timezone ?? "America/New_York"}
        />
      </div>
      <SaveButton type="submit">Save schedule</SaveButton>
    </SaveForm>
  );
}
