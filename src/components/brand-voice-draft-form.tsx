import { generateBrandVoiceDraft } from "@/lib/actions/brand-voice";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function BrandVoiceDraftForm({ disabled }: { disabled?: boolean }) {
  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can create a draft. GroovGro keeps it in this
        workspace. It will not send email, post to social, or edit the live
        website.
      </p>
    );
  }

  return (
    <SaveForm
      action={generateBrandVoiceDraft}
      successMessage="Draft saved in GroovGro. It was not sent or published."
      className="space-y-3"
    >
      <div className="space-y-2">
        <Label htmlFor="purpose">Draft type</Label>
        <select
          id="purpose"
          name="purpose"
          className={selectClassName}
          defaultValue="website_blurb"
        >
          <option value="website_blurb">Website blurb</option>
          <option value="follow_up_note">Follow-up note (not sent)</option>
          <option value="social_post">Social post (not published)</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="topic">Topic</Label>
        <Textarea
          id="topic"
          name="topic"
          rows={3}
          required
          placeholder="What this piece should cover"
        />
      </div>
      <SaveButton pendingLabel="Drafting…">Create draft</SaveButton>
    </SaveForm>
  );
}
