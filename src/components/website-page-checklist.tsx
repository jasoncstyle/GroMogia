import {
  addWebsitePage,
  findWebsitePages,
  saveWebsitePageChecks,
} from "@/lib/actions/growth";
import { groupWebsitePages } from "@/lib/growth/website-pages";
import { FoldableSample } from "@/components/foldable-sample";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type WebsiteChecklistPage = {
  id: string
  url: string
  label: string
  pageGroup: string
  important: boolean
};

function PageCheck({ page }: { page: WebsiteChecklistPage }) {
  return (
    <label className="flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2 text-sm">
      <input
        type="checkbox"
        name="pageIds"
        value={page.id}
        defaultChecked={page.important}
        className="mt-1 size-4 shrink-0"
      />
      <span className="min-w-0">
        <span className="block font-medium">{page.label || "Page"}</span>
        <span className="block break-all text-xs text-muted-foreground">
          {page.url}
        </span>
      </span>
    </label>
  );
}

export function WebsitePageChecklist({
  pages,
  disabled,
}: {
  pages: WebsiteChecklistPage[]
  disabled?: boolean
}) {
  const groups = groupWebsitePages(pages);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        GroovGro finds pages it can see. You check the important ones. Review
        connected data then reads only those pages. The live website is not
        changed.
      </p>
      <SaveForm action={findWebsitePages} successMessage="Pages found">
        <SaveButton
          type="submit"
          disabled={disabled}
          pendingLabel="Finding pages…"
        >
          Find pages
        </SaveButton>
      </SaveForm>

      {pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pages listed yet. Save the website address, then click Find pages.
        </p>
      ) : (
        <SaveForm
          action={saveWebsitePageChecks}
          successMessage="Page list saved"
          className="space-y-4"
        >
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="text-sm font-medium">{group.heading}</p>
              {group.pages.map((page) => (
                <PageCheck key={page.id} page={page} />
              ))}
              {group.nested ? (
                <FoldableSample
                  title={group.nested.heading}
                  subtitle={`${group.nested.pages.length} page${group.nested.pages.length === 1 ? "" : "s"}. Open to check or uncheck.`}
                >
                  {group.nested.pages.map((page) => (
                    <PageCheck key={page.id} page={page} />
                  ))}
                </FoldableSample>
              ) : null}
            </div>
          ))}
          <SaveButton type="submit" disabled={disabled}>
            Save page list
          </SaveButton>
        </SaveForm>
      )}

      <SaveForm
        action={addWebsitePage}
        successMessage="Page added"
        resetOnSuccess
        className="space-y-2"
      >
        <Label htmlFor="pageUrl">Add a page</Label>
        <Input
          id="pageUrl"
          name="pageUrl"
          placeholder="https://example.com/calendar"
        />
        <p className="text-xs text-muted-foreground">
          Paste a missing public address if Find pages did not list it.
        </p>
        <SaveButton type="submit" variant="outline" disabled={disabled}>
          Add this page
        </SaveButton>
      </SaveForm>
    </div>
  );
}
