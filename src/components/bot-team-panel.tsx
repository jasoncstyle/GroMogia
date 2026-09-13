import { decideBotProposal, saveBotProposalPack } from "@/lib/actions/bot-team";
import {
  BOT_STATUS_APPROVED,
  BOT_STATUS_PROPOSED,
  describeBotSeat,
  type BotSeat,
} from "@/lib/growth/bot-team";
import type { BotProposalRow } from "@/lib/growth/bot-team-query";
import { CopyText } from "@/components/copy-text";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BotTeamPanel({
  seat,
  heading,
  items,
  handoffUrl,
  sampleText,
  canManage = false,
}: {
  seat: BotSeat
  heading: string
  items: BotProposalRow[]
  handoffUrl: string
  sampleText: string
  canManage?: boolean
}) {
  const meta = describeBotSeat(seat);
  const open = items.filter(
    (item) =>
      item.status === BOT_STATUS_PROPOSED || item.status === BOT_STATUS_APPROVED,
  );
  const usedLabel =
    seat === "booksgro"
      ? "I used this in QuickBooks"
      : seat === "draftgro"
        ? "I sent this myself"
        : "I pasted this myself";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        <CardDescription>
          Monday review: approve or reject what {meta.name} wrote into GroovGro.
          {meta.role} You mark what ships. You are not the courier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {meta.name} handoff: {handoffUrl}
          </p>
          <CopyText text={handoffUrl} label={`Copy ${meta.name} handoff URL`} />
        </div>
        <p className="text-sm text-muted-foreground">
          {meta.name} uses the desk token: GET this URL, then POST the pack
          back. One property per pack. Do not mix brands.
        </p>
        {sampleText ? (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">
              Sample payload (same contract as the handoff)
            </summary>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CopyText text={sampleText} label={`Copy ${meta.name} sample`} />
            </div>
          </details>
        ) : (
          <p className="text-sm text-muted-foreground">
            Save brand, offers, or payments so {meta.name} has stored facts to
            read.
          </p>
        )}
        {canManage ? (
          <SaveForm
            action={saveBotProposalPack}
            successMessage="Proposal pack saved. Nothing was sent or published."
            resetOnSuccess
            className="space-y-2"
          >
            <input type="hidden" name="seat" value={seat} />
            <label className="block text-sm font-medium" htmlFor={`bot-pack-${seat}`}>
              Fallback: paste a sample pack
            </label>
            <textarea
              id={`bot-pack-${seat}`}
              name="pack"
              rows={6}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder='{"property":"your-site","items":[]}'
            />
            <SaveButton type="submit" size="sm">
              Save proposal pack
            </SaveButton>
          </SaveForm>
        ) : null}
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {meta.name} proposals waiting. Stay quiet when nothing is worth
            doing.
          </p>
        ) : (
          <ul className="space-y-3">
            {open.map((item) => (
              <li key={item.id} className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {item.property} · {item.type.replace(/_/g, " ")} · {item.status}
                </p>
                <p className="text-sm text-muted-foreground">{item.evidence}</p>
                {item.expectedEffect ? (
                  <p className="text-sm text-muted-foreground">
                    Expected: {item.expectedEffect}
                  </p>
                ) : null}
                {item.draft ? (
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                    {item.draft}
                  </pre>
                ) : null}
                {canManage && item.status === BOT_STATUS_PROPOSED ? (
                  <div className="flex flex-wrap gap-2">
                    <SaveForm
                      action={decideBotProposal}
                      successMessage="Proposal approved."
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="action" value="approve" />
                      <SaveButton type="submit" size="sm">
                        Approve
                      </SaveButton>
                    </SaveForm>
                    <SaveForm
                      action={decideBotProposal}
                      successMessage="Proposal rejected."
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="action" value="reject" />
                      <SaveButton type="submit" size="sm" variant="outline">
                        Reject
                      </SaveButton>
                    </SaveForm>
                  </div>
                ) : null}
                {canManage && item.status === BOT_STATUS_APPROVED ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {item.draft ? (
                      <CopyText text={item.draft} label="Copy draft" />
                    ) : null}
                    <SaveForm
                      action={decideBotProposal}
                      successMessage="Recorded as used."
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="action" value="ship" />
                      <SaveButton type="submit" size="sm">
                        {usedLabel}
                      </SaveButton>
                    </SaveForm>
                    <p className="text-xs text-muted-foreground">
                      GroovGro records that you acted. It does not send, publish,
                      or move money.
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
