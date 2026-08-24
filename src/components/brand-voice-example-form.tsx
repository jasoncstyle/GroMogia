import { addBrandVoiceExample } from "@/lib/actions/brand-voice";
import {
  VOICE_EXAMPLE_BODY_MAX,
  VOICE_EXAMPLE_TITLE_MAX,
} from "@/lib/brand-voice/limits";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function BrandVoiceExampleForm({ disabled }: { disabled?: boolean }) {
  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can save a brand voice example. GroovGro will not send
        email, post to social, or edit the live website.
      </p>
    );
  }

  return (
    <SaveForm
      action={addBrandVoiceExample}
      successMessage="Example saved"
      resetOnSuccess
      className="space-y-3"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Short name</Label>
        <Input id="title" name="title" required maxLength={VOICE_EXAMPLE_TITLE_MAX} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="direction">This example is</Label>
        <select
          id="direction"
          name="direction"
          className={selectClassName}
          defaultValue="more_like_this"
        >
          <option value="more_like_this">More like this</option>
          <option value="less_like_this">Less like this</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">The writing</Label>
        <Textarea
          id="body"
          name="body"
          rows={5}
          required
          maxLength={VOICE_EXAMPLE_BODY_MAX}
        />
      </div>
      <SaveButton>Save example</SaveButton>
    </SaveForm>
  );
}
