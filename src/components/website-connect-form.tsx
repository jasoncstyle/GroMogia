"use client";

import { saveWebsiteConnection } from "@/lib/actions/website";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WebsiteConnectForm({
  defaultUrl,
  canSave,
}: {
  defaultUrl: string
  canSave: boolean
}) {
  if (!canSave) {
    return (
      <p className="text-xs text-muted-foreground">
        An owner or admin can connect the existing website. GroovGro will not
        move the live site.
      </p>
    );
  }

  return (
    <SaveForm
      action={saveWebsiteConnection}
      successMessage="Website saved. Open Website to copy the tracking snippet. GroovGro did not move the live site."
      className="space-y-3"
    >
      <div className="space-y-2">
        <Label htmlFor="next-step-publicUrl">Website address</Label>
        <Input
          id="next-step-publicUrl"
          name="publicUrl"
          placeholder="https://example.com"
          defaultValue={defaultUrl}
        />
      </div>
      <SaveButton type="submit">Save website</SaveButton>
    </SaveForm>
  );
}
