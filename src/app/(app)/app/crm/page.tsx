import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { convertLeadToCustomer, moveLead } from "@/lib/actions/crm";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { contacts, customers, leadRecords, leadStages } from "@/lib/db/schema";
import { getGrowthLinkOptions } from "@/lib/growth/queries";
import { appUrl } from "@/lib/env";
import { resolveOrganizationSlug } from "@/lib/org";
import { formatMoney } from "@/lib/money";
import { CopyLink } from "@/components/copy-link";
import { LeadCreateForm } from "@/components/lead-create-form";
import { OpenNextStepLink } from "@/components/open-next-step-link";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const firstCampaignByContact = new Map<string, string>();
  for (const { lead } of [...leadRows].reverse()) {
    if (!firstCampaignByContact.has(lead.contactId)) {
      firstCampaignByContact.set(lead.contactId, lead.campaignId ?? "");
    }
  }

  const links = organizationId
    ? await getGrowthLinkOptions(organizationId)
    : { offers: [], goals: [] };

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
              window to send a test lead. To name a share, open{" "}
              <Link href="/app/marketing" className="underline">
                Marketing
              </Link>
              . GroovGro will not buy ads.
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
          <LeadCreateForm
            offers={links.offers}
            goals={links.goals}
            disabled={!organizationId}
          />
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
                  <TableHead>Share name</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadRows.map(({ lead, contact, stage }) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">{contact.displayName}</div>
                      <div className="text-muted-foreground">{contact.email}</div>
                      {lead.offerId || lead.goalId ? (
                        <div className="text-muted-foreground">
                          {links.offers.find((offer) => offer.id === lead.offerId)?.name ??
                            links.goals.find((goal) => goal.id === lead.goalId)?.title ??
                            ""}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{stage.name}</TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell>{lead.campaignId || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <SaveForm action={moveLead} successMessage="Lead moved">
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
                          <SaveButton type="submit" variant="outline" className="ml-2">
                            Move
                          </SaveButton>
                        </SaveForm>
                        {!stage.isWon ? (
                          <SaveForm action={convertLeadToCustomer} successMessage="Marked as customer">
                            <input type="hidden" name="leadId" value={lead.id} />
                            <SaveButton type="submit" variant="secondary">
                              Mark customer
                            </SaveButton>
                          </SaveForm>
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
            Paying or converted people. Same contact record as the lead. Share
            name is the name you typed for the first named share that brought
            this person in.
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
                  <TableHead>Share name</TableHead>
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
                    <TableCell>
                      {firstCampaignByContact.get(customer.contactId) || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OpenNextStepLink />
    </div>
  );
}
