import { convertLeadToCustomer, moveLead } from "@/lib/actions/crm";
import { SaveButton, SaveForm } from "@/components/save-form";

const selectClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function LeadFollowUpButtons({
  leadId,
  stageId,
  stages,
  canMove,
  canConvert,
  isWon,
}: {
  leadId: string
  stageId: string
  stages: { id: string; name: string }[]
  canMove: boolean
  canConvert: boolean
  isWon: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <SaveForm action={moveLead} successMessage="Lead moved. GroovGro did not email anyone.">
        <input type="hidden" name="leadId" value={leadId} />
        <select
          name="stageId"
          defaultValue={stageId}
          className={selectClassName}
          disabled={!canMove}
        >
          {stages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <SaveButton type="submit" variant="outline" disabled={!canMove} className="ml-2">
          Move
        </SaveButton>
      </SaveForm>
      {!isWon ? (
        <SaveForm
          action={convertLeadToCustomer}
          successMessage="Marked as customer. GroovGro did not email anyone."
        >
          <input type="hidden" name="leadId" value={leadId} />
          <SaveButton type="submit" variant="secondary" disabled={!canConvert}>
            Mark customer
          </SaveButton>
        </SaveForm>
      ) : null}
    </div>
  );
}
