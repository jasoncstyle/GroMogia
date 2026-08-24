import { connectStripe, disconnectStripe, syncStripePayments } from "@/lib/actions/stripe";
import { SaveButton, SaveForm } from "@/components/save-form";

export function StripeReadCopyPanel({
  configured,
  connected,
  lastError,
  canManage = true,
  showDisconnect = false,
  mode = "auto",
}: {
  configured: boolean
  connected: boolean
  lastError?: string | null
  canManage?: boolean
  showDisconnect?: boolean
  mode?: "connect" | "sync" | "auto"
}) {
  const showConnect = mode === "connect" || (mode === "auto" && !connected);
  const showSync = mode === "sync" || (mode === "auto" && connected);

  if (!configured) {
    return (
      <p className="text-sm text-muted-foreground">
        Stripe keys are not on this GroovGro deployment yet. GroovGro will not
        charge a card or change checkout on the connected website.
      </p>
    );
  }

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can connect payments so GroovGro can read a copy.
        GroovGro will not charge a card or change checkout on the connected
        website.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {showConnect && !connected ? (
        <SaveForm action={connectStripe} successMessage="Stripe connected. GroovGro did not charge a card.">
          <SaveButton type="submit">Connect Stripe</SaveButton>
        </SaveForm>
      ) : null}
      {showSync && connected ? (
        <SaveForm action={syncStripePayments} successMessage="Stripe synced. GroovGro did not charge a card.">
          <SaveButton type="submit" pendingLabel="Syncing…">
            Sync recent Stripe activity
          </SaveButton>
        </SaveForm>
      ) : null}
      {showDisconnect && connected ? (
        <SaveForm action={disconnectStripe} successMessage="Stripe disconnected">
          <SaveButton type="submit" variant="outline">
            Disconnect
          </SaveButton>
        </SaveForm>
      ) : null}
      {lastError ? (
        <p className="w-full text-sm text-destructive">{lastError}</p>
      ) : null}
    </div>
  );
}
