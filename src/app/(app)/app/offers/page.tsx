import {
  createConstraint,
  createOffer,
} from "@/lib/actions/growth";
import {
  ConfirmRejectButtons,
  InferredBadge,
  ReviewConnectedDataButton,
} from "@/components/growth-review";
import { getAppSession } from "@/lib/auth/session";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import {
  CONSTRAINT_TYPES,
  OFFER_TYPES,
  PRICING_MODELS,
  labelFor,
} from "@/lib/growth/types";
import { formatMoney } from "@/lib/money";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export default async function OffersPage() {
  const session = await getAppSession();
  const snapshot = session.organizationId
    ? await getGrowthSnapshot(session.organizationId)
    : null;
  const offerRows = snapshot?.offers ?? [];
  const constraints = snapshot?.constraints ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
        <p className="text-muted-foreground">
          An Offer is anything this business promotes, sells, or wants a
          customer to do. It is not assumed to be a physical product.
        </p>
        <div className="mt-3">
          <ReviewConnectedDataButton disabled={!session.organizationId} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add an offer</CardTitle>
          <CardDescription>
            Examples: a service, a membership, a registration, a donation, or a
            lead magnet. Use whatever type fits this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <SaveButton type="submit" disabled={!session.organizationId}>
              Save offer
            </SaveButton>
          </SaveForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Offers</CardTitle>
        </CardHeader>
        <CardContent>
          {offerRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No offers yet. Add what this business wants customers to do.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offer</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offerRows.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div className="font-medium">{offer.name}</div>
                      <div className="text-muted-foreground">
                        {labelFor(offer.offerType)}
                        {offer.category ? ` · ${offer.category}` : ""}
                      </div>
                      {offer.discoveryStatus === "inferred" ? (
                        <InferredBadge
                          source={offer.inferredFrom}
                          confidence={offer.confidence}
                        />
                      ) : null}
                      {offer.discoveryStatus === "inferred" ? (
                        <div className="mt-2">
                          <ConfirmRejectButtons id={offer.id} kind="offer" />
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{labelFor(offer.availabilityModel)}</TableCell>
                    <TableCell>
                      {offer.priceCents == null
                        ? "Not set"
                        : formatMoney(offer.priceCents, offer.currency)}
                    </TableCell>
                    <TableCell>{offer.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability and constraints</CardTitle>
          <CardDescription>
            Limits are generalized: inventory, capacity, schedule, resource,
            workload, a time window, an external system, or none. Not every
            business needs this.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SaveForm
            action={createConstraint}
            successMessage="Constraint saved"
            resetOnSuccess
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="offerId">Related offer</Label>
              <select id="offerId" name="offerId" className={selectClassName} defaultValue="">
                <option value="">Whole business</option>
                {offerRows.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="constraintType">Constraint type</Label>
              <select
                id="constraintType"
                name="constraintType"
                className={selectClassName}
                defaultValue="capacity"
              >
                {CONSTRAINT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {labelFor(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" placeholder="hours, spots, units" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resourceName">Resource</Label>
              <Input id="resourceName" name="resourceName" placeholder="Staff, room, equipment" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalAvailability">Total available</Label>
              <Input id="totalAvailability" name="totalAvailability" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remainingAvailability">Remaining</Label>
              <Input id="remainingAvailability" name="remainingAvailability" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startsOn">Starts</Label>
              <Input id="startsOn" name="startsOn" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsOn">Ends</Label>
              <Input id="endsOn" name="endsOn" type="datetime-local" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" />
            </div>
            <SaveButton type="submit" disabled={!session.organizationId}>
              Save constraint
            </SaveButton>
          </SaveForm>

          {constraints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No constraints yet. Leave this empty if the business has no
              meaningful short-term limit.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Offer</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Resource</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {constraints.map((constraint) => (
                  <TableRow key={constraint.id}>
                    <TableCell>{labelFor(constraint.constraintType)}</TableCell>
                    <TableCell>
                      {offerRows.find((offer) => offer.id === constraint.offerId)?.name ??
                        "Business-wide"}
                    </TableCell>
                    <TableCell>
                      {constraint.remainingAvailability ?? "—"}
                      {constraint.unit ? ` ${constraint.unit}` : ""}
                    </TableCell>
                    <TableCell>{constraint.resourceName || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
