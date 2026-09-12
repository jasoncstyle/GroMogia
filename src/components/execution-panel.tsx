import { createExecutionRequest } from "@/lib/actions/execution";
import {
  actionsWaitingToQueue,
  describeExecutionHeading,
  describeExecutionRequest,
  executionActionTitle,
  type ExecutionAction,
  type ExecutionView,
} from "@/lib/execute/requests";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function ExecutionPanel({
  requests,
  actions,
  canManage = true,
}: {
  requests: ExecutionView[]
  actions: ExecutionAction[]
  canManage?: boolean
}) {
  const openActions = actionsWaitingToQueue(actions, requests);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {describeExecutionHeading(requests.length, openActions.length)}
        </CardTitle>
        <CardDescription>
          Save approved work for later. GroovGro will not run it, buy ads,
          send email, or change the live website. The adapter stays off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.length === 0 && requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Approve a piece of work first. GroovGro will not run it.
          </p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No approved work is waiting to run later. GroovGro will not run
            it, buy ads, or change the live website.
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((row) => (
              <div key={row.id} className="space-y-1">
                <p className="text-sm font-medium">
                  {describeExecutionRequest(row)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.createdAt.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {canManage && openActions.length > 0 ? (
          <SaveForm>
            action={createExecutionRequest}
            successMessage="Later-run request saved. GroovGro did not run it, buy ads, or change the live website."
            className="grid gap-3"
            resetOnSuccess
          >
            <div className="space-y-2">
              <Label htmlFor="executionAction">Approved work</Label>
              <select
                id="executionAction"
                name="actionId"
                className={selectClassName}
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Pick approved work
                </option>
                {openActions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {executionActionTitle(action)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="executionNote">
                What you already do by hand, if you want
              </Label>
              <Textarea
                id="executionNote"
                name="note"
                rows={3}
                placeholder="Optional. GroovGro will not run this work, buy ads, or change the live website."
              />
            </div>
            <SaveButton type="submit">Save for later</SaveButton>
          </SaveForm>
        ) : canManage && actions.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            All approved work is already saved for later. GroovGro did not
            run it, buy ads, or change the live website.
          </p>
        ) : canManage ? null : (
          <p className="text-sm text-muted-foreground">
            An owner or admin can save approved work for later. GroovGro will
            not run it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
