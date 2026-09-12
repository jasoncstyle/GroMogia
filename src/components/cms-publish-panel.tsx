import { createCmsPublishRequest } from "@/lib/actions/cms-publish";
import {
  describeCmsPublishRequest,
  describePublishQueueCopy,
  describePublishQueueHeading,
  draftsWaitingToQueue,
  type CmsPublishView,
} from "@/lib/cms/requests";
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

export function CmsPublishPanel({
  requests,
  drafts,
  canManage = true,
}: {
  requests: CmsPublishView[]
  drafts: Array<{ id: string; title: string }>
  canManage?: boolean
}) {
  const openDrafts = draftsWaitingToQueue(drafts, requests);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {describePublishQueueHeading(requests.length, openDrafts.length)}
        </CardTitle>
        <CardDescription>
          {describePublishQueueCopy(openDrafts.length)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Write a workspace draft first. GroovGro will not guess what to
            publish.
          </p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No drafts are waiting for later review. A later allowed adapter
            can publish after you approve. Not in this slice.
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((row) => (
              <div key={row.id} className="space-y-1">
                <p className="text-sm font-medium">
                  {describeCmsPublishRequest(row)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.createdAt.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {canManage && openDrafts.length > 0 ? (
          <SaveForm
            action={createCmsPublishRequest}
            successMessage="Publish request saved. GroovGro did not publish or change the live website."
            className="grid gap-3"
            resetOnSuccess
          >
            <div className="space-y-2">
              <Label htmlFor="cmsPublishDraft">Workspace draft</Label>
              <select
                id="cmsPublishDraft"
                name="draftId"
                className={selectClassName}
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Pick a workspace draft
                </option>
                {openDrafts.map((draft) => (
                  <option key={draft.id} value={draft.id}>
                    {draft.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cmsPublishNote">
                Where you already publish, if you want
              </Label>
              <Textarea
                id="cmsPublishNote"
                name="note"
                rows={3}
                placeholder="Optional. GroovGro will not publish or change the live website."
              />
            </div>
            <SaveButton type="submit">Save for later review</SaveButton>
          </SaveForm>
        ) : canManage && drafts.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            All workspace drafts are already saved for later review. GroovGro
            did not publish or change the live website.
          </p>
        ) : canManage ? null : (
          <p className="text-sm text-muted-foreground">
            An owner or admin can save a draft for later review. GroovGro will
            not publish.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
