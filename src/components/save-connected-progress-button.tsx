import { refreshConnectedGoalProgress } from "@/lib/actions/growth";
import { SaveButton, SaveForm } from "@/components/save-form";

export function SaveConnectedProgressButton({
  disabled,
}: {
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can save today&apos;s Goal number from connected
        data. GroovGro will not start marketing.
      </p>
    );
  }

  return (
    <SaveForm
      action={refreshConnectedGoalProgress}
      successMessage="Progress saved. GroovGro did not start marketing."
    >
      <SaveButton type="submit" pendingLabel="Saving…">
        Save progress from connected data
      </SaveButton>
    </SaveForm>
  );
}
