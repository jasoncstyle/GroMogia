import { saveBrandVoiceProfile } from "@/lib/actions/brand-voice";
import {
  VOICE_AUDIENCE_MAX,
  VOICE_GUIDELINE_MAX,
  VOICE_TONE_MAX,
} from "@/lib/brand-voice/limits";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BrandVoiceProfileForm({
  profile,
  disabled,
}: {
  profile?: {
    tone: string
    audience: string
    doSay: string
    dontSay: string
  } | null
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can save the brand voice. GroovGro will not send
        email, post to social, or edit the live website.
      </p>
    );
  }

  return (
    <SaveForm
      action={saveBrandVoiceProfile}
      successMessage="Brand voice saved"
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="space-y-2">
        <Label htmlFor="tone">Tone</Label>
        <Textarea
          id="tone"
          name="tone"
          rows={3}
          maxLength={VOICE_TONE_MAX}
          defaultValue={profile?.tone ?? ""}
          placeholder="warm, direct, practical"
        />
        <p className="text-xs text-muted-foreground">
          Up to {VOICE_TONE_MAX} characters.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="audience">Who you are speaking to</Label>
        <Textarea
          id="audience"
          name="audience"
          rows={3}
          maxLength={VOICE_AUDIENCE_MAX}
          defaultValue={profile?.audience ?? ""}
          placeholder="first-time guests, returning customers"
        />
        <p className="text-xs text-muted-foreground">
          Up to {VOICE_AUDIENCE_MAX} characters.
        </p>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="doSay">Do say</Label>
        <Textarea
          id="doSay"
          name="doSay"
          rows={4}
          maxLength={VOICE_GUIDELINE_MAX}
          defaultValue={profile?.doSay ?? ""}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="dontSay">Do not say</Label>
        <Textarea
          id="dontSay"
          name="dontSay"
          rows={4}
          maxLength={VOICE_GUIDELINE_MAX}
          defaultValue={profile?.dontSay ?? ""}
        />
      </div>
      <div className="md:col-span-2">
        <SaveButton>Save voice</SaveButton>
      </div>
    </SaveForm>
  );
}
