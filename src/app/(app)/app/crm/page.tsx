import { desc, eq } from "drizzle-orm";

import { convertLeadToCustomer, createLead, moveLead } from "@/lib/actions/crm";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { contacts, customers, leadRecords, leadStages } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { resolveOrganizationSlug } from "@/lib/org";
import { formatMoney } from "@/lib/money";
import { CopyLink } from "@/components/copy-link";
import { Button } from "@/components/ui/button";
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
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm";

export default async function CrmPage() {
  const session = await getAppSession();
  const db = getDb();
  const organizationId = session.organizationId;

  const stages =
    db && organizationId
      ? await db
          .select()
          .from(leadStages)
          .where(eq(leadStages.organizationId, organizationId))
      : [];
  stages.sort((a, b) => a.sortOrder - b.sortOrder);

  const leadRows =
    db && organizationId
      ? await db
          .select({
            lead: leadRecords,
            contact: contacts,
            stage: leadStages,
          })
          .from(leadRecords)
          .innerJoin(contacts, eq(leadRecords.contactId, contacts.id))
          .innerJoin(leadStages, eq(leadRecords.stageId, leadStages.id))
          .where(eq(leadRecords.organizationId, organizationId))
          .orderBy(desc(leadRecords.createdAt))
      : [];

  const customerRows =
    db && organizationId
      ? await db
          .select({
            customer: customers,
            contact: contacts,
          })
          .from(customers)
          .innerJoin(contacts, eq(customers.contactId, contacts.id))
          .where(eq(customers.organizationId, organizationId))
          .orderBy(desc(customers.firstConvertedAt))
      : [];

  const slug = await resolveOrganizationSlug(
    session.organizationId,
    session.organizationSlug,
  );
  const leadFormUrl = slug ? `${appUrl()}/l/${slug}` : "";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Leads & customers
        </h1>
        <p className="text-muted-foreground">
          One person is one contact. A lead and a customer are states of that
          person, not duplicate records.
        </p>
      </div>

      {leadFormUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>Public lead form</CardTitle>
            <CardDescription>
              Customers fill this in without signing in. Open it in a private
              window to send a test lead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CopyLink url={leadFormUrl} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add a person</CardTitle>
          <CardDescription>
            If the email already exists in this organization, GroovGro reuses
            that contact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createLead} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Name</Label>
              <Input id="displayName" name="displayName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input id="source" name="source" placeholder="website, phone, referral" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedValue">Estimated value (optional)</Label>
              <Input id="estimatedValue" name="estimatedValue" placeholder="0.00" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
            <Button type="submit" disabled={!organizationId}>
              Save as new lead
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          {leadRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads yet. Add one above or share the public form.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadRows.map(({ lead, contact, stage }) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">{contact.displayName}</div>
                      <div className="text-muted-foreground">{contact.email}</div>
                    </TableCell>
                    <TableCell>{stage.name}</TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <form action={moveLead}>
                          <input type="hidden" name="leadId" value={lead.id} />
                          <select
                            name="stageId"
                            defaultValue={stage.id}
                            className={selectClassName}
                          >
                            {stages.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="outline" className="ml-2">
                            Move
                          </Button>
                        </form>
                        {!stage.isWon ? (
                          <form action={convertLeadToCustomer}>
                            <input type="hidden" name="leadId" value={lead.id} />
                            <Button type="submit" variant="secondary">
                              Mark customer
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            Paying or converted people. Same contact record as the lead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customerRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No customers yet. Convert a lead or sync a Stripe payment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Lifetime value</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerRows.map(({ customer, contact }) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="font-medium">{contact.displayName}</div>
                      <div className="text-muted-foreground">{contact.email}</div>
                    </TableCell>
                    <TableCell>{formatMoney(customer.ltvCents)}</TableCell>
                    <TableCell>{customer.marketingSource ?? "—"}</TableCell>
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
