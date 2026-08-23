import {
  confirmGoal,
  confirmOffer,
  rejectGoal,
  rejectOffer,
  reviewConnectedBusiness,
} from "@/lib/actions/growth";
import { labelFor } from "@/lib/growth/types";
import { SaveButton, SaveForm } from "@/components/save-form";

export function ReviewConnectedDataButton({ disabled }: { disabled?: boolean }) {
  return (
    <SaveForm
      action={reviewConnectedBusiness}
      successMessage="Review finished"
    >
      <SaveButton type="submit" disabled={disabled} pendingLabel="Reviewing…">
        Review connected data
      </SaveButton>
    </SaveForm>
  );
}

export function ConfirmRejectButtons({
  id,
  kind,
}: {
  id: string
  kind: "offer" | "goal"
}) {
  const confirm = kind === "offer" ? confirmOffer : confirmGoal;
  const reject = kind === "offer" ? rejectOffer : rejectGoal;
  return (
    <div className="flex flex-wrap gap-2">
      <SaveForm action={confirm} successMessage={kind === "offer" ? "Offer confirmed" : "Goal confirmed"}>
        <input type="hidden" name="id" value={id} />
        <SaveButton type="submit" size="sm">
          Confirm
        </SaveButton>
      </SaveForm>
      <SaveForm action={reject} successMessage={kind === "offer" ? "Offer rejected" : "Goal rejected"}>
        <input type="hidden" name="id" value={id} />
        <SaveButton type="submit" variant="outline" size="sm">
          Reject
        </SaveButton>
      </SaveForm>
    </div>
  );
}

export function InferredBadge({
  source,
  confidence,
}: {
  source?: string | null
  confidence?: number | null
}) {
  return (
    <p className="text-xs text-muted-foreground">
      Suggested by GroovGro
      {source ? ` from ${labelFor(source)}` : ""}. Not active until you confirm.
      {confidence != null ? ` Confidence ${confidence}.` : ""}
    </p>
  );
}
