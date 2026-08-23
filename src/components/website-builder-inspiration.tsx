import { draftInspiredBuilderSite } from "@/lib/actions/website-builder";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function UrlField({
  id,
  name,
  label,
}: {
  id: string
  name: string
  label: string
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        placeholder="https://example.com"
        autoComplete="off"
      />
    </div>
  );
}

export function WebsiteBuilderInspiration({
  businessType,
  disabled,
}: {
  businessType: string
  disabled?: boolean
}) {
  return (
    <SaveForm
      action={draftInspiredBuilderSite}
      successMessage="Draft website created."
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        Search the web for something like “inspirational website design” or
        “[your kind of business] website.” Open pages you like. Paste the
        public addresses below. GroovGro reads those public pages for layout
        and topics. It does not copy the site, steal photos, or change any
        live website.
      </p>

      <div className="space-y-1">
        <Label htmlFor="businessType">Kind of business</Label>
        <Input
          id="businessType"
          name="businessType"
          defaultValue={businessType}
          placeholder="What kind of business is this?"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Three websites you like the layout of
        </legend>
        <UrlField id="layoutUrl1" name="layoutUrl1" label="Layout website 1" />
        <UrlField id="layoutUrl2" name="layoutUrl2" label="Layout website 2" />
        <UrlField id="layoutUrl3" name="layoutUrl3" label="Layout website 3" />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Optional: websites for word and topic ideas
        </legend>
        <p className="text-xs text-muted-foreground">
          Paste up to five public pages. GroovGro uses headings as labels. You
          still write the sentences.
        </p>
        <UrlField id="copyUrl1" name="copyUrl1" label="Copy website 1" />
        <UrlField id="copyUrl2" name="copyUrl2" label="Copy website 2" />
        <UrlField id="copyUrl3" name="copyUrl3" label="Copy website 3" />
        <UrlField id="copyUrl4" name="copyUrl4" label="Copy website 4" />
        <UrlField id="copyUrl5" name="copyUrl5" label="Copy website 5" />
      </fieldset>

      <SaveButton disabled={disabled} pendingLabel="Reading pages…">
        Draft my GroovGro site
      </SaveButton>
    </SaveForm>
  );
}
