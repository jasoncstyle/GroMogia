import { getAppSession } from "@/lib/auth/session";
import { isStripeConfigured } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { getCommerceSnapshot } from "@/lib/phase2/queries";
import { Badge } from "@/components/ui/badge";
import { StripeReadCopyPanel } from "@/components/stripe-read-copy-panel";
import { OpenNextStepLink } from "@/components/open-next-step-link";
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

export default async function CommercePage() {
  const session = await getAppSession();
  const snapshot = session.organizationId
    ? await getCommerceSnapshot(session.organizationId)
    : { bookings: [], payments: [], stripe: null };
  const stripeReady = isStripeConfigured();
  const connected = snapshot.stripe?.status === "connected";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bookings & payments
        </h1>
        <p className="text-muted-foreground">
          GroovGro stores amounts, status, and Stripe IDs. It never stores card
          numbers, CVC codes, or bank account numbers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Stripe</CardTitle>
            <Badge variant={connected ? "secondary" : "outline"}>
              {connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <CardDescription>
            Add Stripe test keys in Vercel first. Then mark this organization as
            connected so webhooks know where bookings belong. Details are in
            docs/phase-2/USER_SETUP.md.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StripeReadCopyPanel
            configured={stripeReady}
            connected={connected}
            lastError={snapshot.stripe?.lastError}
            showDisconnect
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments yet. Connect Stripe, then sync or send a test webhook.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stripe object</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {formatMoney(payment.amountCents, payment.currency)}
                    </TableCell>
                    <TableCell>{payment.kind}</TableCell>
                    <TableCell>{payment.status}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.providerObjectId}
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
          <CardTitle>Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bookings appear when Stripe checkout or charges are imported.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>External ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-xs">
                      {booking.externalId}
                    </TableCell>
                    <TableCell>{booking.status}</TableCell>
                    <TableCell>{booking.source}</TableCell>
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
