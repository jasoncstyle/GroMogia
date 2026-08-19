import { eq } from "drizzle-orm";

import { connectStripe, disconnectStripe } from "@/lib/actions/stripe";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { integrationConnections } from "@/lib/db/schema";
import { isStripeConfigured } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KNOWN_PROVIDERS } from "@/modules/integrations/types";

export default async function IntegrationsPage() {
  const session = await getAppSession();
  const db = getDb();
  const connections =
    db && session.organizationId
      ? await db
          .select()
          .from(integrationConnections)
          .where(eq(integrationConnections.organizationId, session.organizationId))
      : [];

  const stripeReady = isStripeConfigured();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          GroovGro stores canonical business data. Vendors plug in through
          adapters. Nothing is tightly coupled to one email, ads, or website
          host.
        </p>
      </div>
      <div className="grid gap-3">
        {KNOWN_PROVIDERS.map((provider) => {
          const connection = connections.find(
            (row) => row.providerKey === provider.key,
          );
          const connected = connection?.status === "connected";
          return (
            <Card key={provider.key}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{provider.name}</CardTitle>
                  <Badge variant={connected ? "secondary" : "outline"}>
                    {connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <CardDescription>
                  Capabilities: {provider.capabilities.join(", ")}.
                  {provider.key === "stripe"
                    ? " Phase 2 uses Stripe for bookings and payments. Card numbers never enter GroovGro."
                    : " Connect in a later phase using OAuth or official APIs. Tokens stay in Vercel, never in git."}
                </CardDescription>
              </CardHeader>
              {provider.key === "stripe" ? (
                <CardFooter className="gap-2">
                  {!stripeReady ? (
                    <p className="text-sm text-muted-foreground">
                      Add STRIPE_SECRET_KEY in Vercel, then redeploy.
                    </p>
                  ) : connected ? (
                    <form action={disconnectStripe}>
                      <Button type="submit" variant="outline">
                        Disconnect Stripe
                      </Button>
                    </form>
                  ) : (
                    <form action={connectStripe}>
                      <Button type="submit">Connect Stripe</Button>
                    </form>
                  )}
                </CardFooter>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
