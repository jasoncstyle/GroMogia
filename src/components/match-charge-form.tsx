import { matchPaymentToPerson } from "@/lib/actions/commerce";
import { labelForMatchedPerson } from "@/lib/commerce/match-charge";
import { SaveButton, SaveForm } from "@/components/save-form";

const selectClassName =
  "h-8 max-w-56 rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function MatchChargeForm({
  paymentId,
  people,
  disabled,
}: {
  paymentId: string
  people: { id: string; displayName: string; email: string | null }[]
  disabled: boolean
}) {
  if (people.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Add a person on Next step first. GroovGro will not email them or
        change checkout.
      </p>
    );
  }

  return (
    <SaveForm
      action={matchPaymentToPerson}
      successMessage="Payment matched to a person. GroovGro will not charge a card or change checkout."
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="paymentId" value={paymentId} />
      <select
        name="contactId"
        required
        disabled={disabled}
        className={selectClassName}
        aria-label="Person for this payment"
      >
        <option value="">Choose a person</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {labelForMatchedPerson(person)}
          </option>
        ))}
      </select>
      <SaveButton type="submit" variant="outline" disabled={disabled}>
        Match
      </SaveButton>
    </SaveForm>
  );
}
