import { updateBrandSettings } from "@/lib/actions/brand";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type BrandSettingsValues = {
  businessName?: string | null
  description?: string | null
  targetCustomers?: string | null
};

export function BrandSettingsForm({
  brand,
  organizationName,
  disabled,
}: {
  brand?: BrandSettingsValues | null
  organizationName?: string | null
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can save the brand. GroovGro will not start
        marketing, send email, or edit the live website.
      </p>
    );
  }

  return (
    <SaveForm
      action={updateBrandSettings}
      successMessage="Brand saved"
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          name="businessName"
          defaultValue={brand?.businessName ?? organizationName ?? ""}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">What the business does</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={brand?.description ?? ""}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetCustomers">Who it serves</Label>
        <Input
          id="targetCustomers"
          name="targetCustomers"
          defaultValue={brand?.targetCustomers ?? ""}
        />
      </div>
      <SaveButton type="submit">Save brand</SaveButton>
    </SaveForm>
  );
}
