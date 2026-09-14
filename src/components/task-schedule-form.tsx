import { saveTaskSchedule } from "@/lib/actions/jobs";
import { getAppSession } from "@/lib/auth/session";
import { getTaskSchedule } from "@/lib/jobs/query";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Label } from "@/components/ui/label";

function whenLabel(value: Date | null): string {
  if (!value) return "not set";
  return value.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
}

export async function TaskScheduleForm({
  taskKey,
  canManage = true,
}: {
  taskKey: string
  canManage?: boolean
}) {
  const session = await getAppSession();
  const schedule = session.organizationId
    ? await getTaskSchedule(session.organizationId, taskKey)
    : null;
  if (!schedule) return null;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">Refresh on a schedule</p>
        <p className="text-sm text-muted-foreground">
          {schedule.description} The refresh button still works. GroovGro does
          not publish, send, or buy ads.
        </p>
      </div>
      <SaveForm
        action={saveTaskSchedule}
        successMessage="Schedule saved."
        className="space-y-3"
      >
        <input type="hidden" name="taskKey" value={schedule.taskKey} />
        <div className="space-y-2">
          <Label htmlFor={`frequency-${schedule.taskKey}`}>How often</Label>
          <select
            id={`frequency-${schedule.taskKey}`}
            name="frequency"
            defaultValue={schedule.frequency}
            disabled={!canManage}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="off">Manual only</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
          </select>
        </div>
        {canManage ? (
          <SaveButton type="submit" variant="outline">
            Save schedule
          </SaveButton>
        ) : null}
      </SaveForm>
      <p className="text-xs text-muted-foreground">
        Last run: {whenLabel(schedule.lastRunAt)}. Next run:{" "}
        {whenLabel(schedule.nextRunAt)}.
        {schedule.lastError ? ` Last note: ${schedule.lastError}` : ""}
      </p>
    </div>
  );
}
