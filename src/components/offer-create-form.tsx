import { createOffer } from "@/lib/actions/growth";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CONSTRAINT_TYPES,
  OFFER_TYPES,
  PRICING_MODELS,
  labelFor,
} from "@/lib/growth/types";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function OfferCreateForm({ disabled }: { disabled?: boolean }) {
  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        An owner or admin can add an offer. GroovGro will not start marketing.
      </p>
    );
  }

  return (
    <SaveForm
      action={createOffer}
      successMessage="Offer saved"
      resetOnSuccess
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="offerType">Type</Label>
        <select id="offerType" name="offerType" className={selectClassName} defaultValue="other">
          {OFFER_TYPES.map((type) => (
            <option key={type} value={type}>
              {labelFor(type)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pricingModel">Pricing model</Label>
        <select
          id="pricingModel"
          name="pricingModel"
          className={selectClassName}
          defaultValue="unspecified"
        >
          {PRICING_MODELS.map((model) => (
            <option key={model} value={model}>
              {labelFor(model)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="availabilityModel">Availability model</Label>
        <select
          id="availabilityModel"
          name="availabilityModel"
          className={selectClassName}
          defaultValue="unconstrained"
        >
          {CONSTRAINT_TYPES.map((type) => (
            <option key={type} value={type}>
              {labelFor(type)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Price</Label>
        <Input id="price" name="price" placeholder="0.00" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cost">Cost to deliver</Label>
        <Input id="cost" name="cost" placeholder="0.00" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" className={selectClassName} defaultValue="active">
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="conversionUrl">Where the customer acts</Label>
        <Input id="conversionUrl" name="conversionUrl" placeholder="https://" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="md:col-span-2">
        <SaveButton>Save offer</SaveButton>
      </div>
    </SaveForm>
  );
}
