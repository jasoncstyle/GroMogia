import { createContentBrief } from "@/lib/actions/content-briefs";
import { createContentDraft } from "@/lib/actions/content-drafts";
import { markSearchLoopPasted } from "@/lib/actions/search-loop";
import { suggestBriefOutline } from "@/lib/growth/content-briefs";
import {
  SEARCH_LOOP_STEP_CHECK,
  SEARCH_LOOP_STEP_DONE,
  SEARCH_LOOP_STEP_PASTE,
  SEARCH_LOOP_STEP_SAVE_BRIEF,
  SEARCH_LOOP_STEP_WAIT,
  SEARCH_LOOP_STEP_WRITE_DRAFT,
  writeSearchLoopPasteCopy,
  type SearchLoopView,
} from "@/lib/growth/search-loop";
import { CopyText } from "@/components/copy-text";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SearchLoopPanel({
  loop,
  canManage = true,
  embed = false,
}: {
  loop: SearchLoopView
  canManage?: boolean
  embed?: boolean
}) {
  const pasteCopy = writeSearchLoopPasteCopy({
    query: loop.query,
    title: loop.brief?.title || loop.query,
    audience: loop.brief?.audience || loop.offerName,
    outline: loop.brief?.outline,
    offerName: loop.offerName,
    page: loop.page,
  });
  const body = (
    <div className="space-y-3">
      {loop.step === SEARCH_LOOP_STEP_WAIT ? (
        <p className="text-sm text-muted-foreground">{loop.why}</p>
      ) : (
        <>
          <p className="text-sm font-medium">{loop.query}</p>
          <p className="text-sm text-muted-foreground">{loop.why}</p>
          {loop.page ? (
            <p className="text-sm text-muted-foreground">
              {loop.page.kind === "improve"
                ? `Paste on the existing page: ${loop.page.url}`
                : `Create a page on your existing site for this search. A starting place is ${loop.page.url}. GroovGro will not create that page.`}
            </p>
          ) : null}
        </>
      )}
      {loop.step === SEARCH_LOOP_STEP_PASTE || loop.brief?.draft ? (
        <div className="space-y-2">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {loop.brief?.draft?.body || pasteCopy}
          </p>
          <CopyText text={loop.brief?.draft?.body || pasteCopy} label="Copy the words to paste" />
        </div>
      ) : null}
      {canManage && loop.step === SEARCH_LOOP_STEP_SAVE_BRIEF ? (
        <SaveForm
          action={createContentBrief}
          successMessage="Content brief saved to the planner. GroovGro did not write a page."
        >
          <input type="hidden" name="query" value={loop.query} />
          <input type="hidden" name="title" value={loop.query} />
          <input type="hidden" name="source" value="content_gap" />
          <input type="hidden" name="audience" value={loop.offerName} />
          <input
            type="hidden"
            name="outline"
            value={suggestBriefOutline(loop.query)}
          />
          <SaveButton type="submit" size="sm">
            Save a brief for this search
          </SaveButton>
        </SaveForm>
      ) : null}
      {canManage && loop.step === SEARCH_LOOP_STEP_WRITE_DRAFT && loop.brief ? (
        <SaveForm
          action={createContentDraft}
          successMessage="Workspace draft saved. GroovGro did not publish it or change the live website."
        >
          <input type="hidden" name="briefId" value={loop.brief.id} />
          <SaveButton type="submit" size="sm">
            Write a draft for this search
          </SaveButton>
        </SaveForm>
      ) : null}
      {canManage && loop.step === SEARCH_LOOP_STEP_PASTE && loop.brief?.draft ? (
        <SaveForm
          action={markSearchLoopPasted}
          successMessage="Saved. GroovGro recorded that you pasted this on your site. It did not publish."
        >
          <input type="hidden" name="query" value={loop.query} />
          <input type="hidden" name="briefId" value={loop.brief.id} />
          <input type="hidden" name="draftId" value={loop.brief.draft.id} />
          <input type="hidden" name="pageUrl" value={loop.page?.url ?? ""} />
          <input type="hidden" name="goalId" value={loop.goalId ?? ""} />
          <SaveButton type="submit" size="sm">
            I pasted this on the site
          </SaveButton>
        </SaveForm>
      ) : null}
      {loop.step === SEARCH_LOOP_STEP_CHECK ? (
        <p className="text-sm text-muted-foreground">
          You already pasted this. Check what changed on Next step after Search
          Console has a newer snapshot. GroovGro will not change the plan or
          the live website.
        </p>
      ) : null}
      {loop.step === SEARCH_LOOP_STEP_DONE ? (
        <p className="text-sm text-muted-foreground">
          This search-to-page loop is listed. GroovGro will pick another
          worth-a-look query when one is still waiting.
        </p>
      ) : null}
    </div>
  );

  if (embed) {
    return body;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{loop.heading}</CardTitle>
        <CardDescription>
          One search topic at a time: save a brief, write a draft in this
          business’s words, paste it on your existing site, then check stored
          Search Console numbers and the Goal. GroovGro does not publish,
          scrape Google, buy ads, or overwrite the live website.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
