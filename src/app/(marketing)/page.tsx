import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  isClerkConfigured,
  isDatabaseConfigured,
  isStripeConfigured,
} from "@/lib/env";

export default function MarketingPage() {
  const clerkReady = isClerkConfigured();
  const databaseReady = isDatabaseConfigured();
  const stripeReady = isStripeConfigured();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold tracking-tight">GroMogia</p>
            <p className="text-xs text-muted-foreground">
              Marketing · Operations · Growth · Intelligence · Analytics
            </p>
          </div>
          <Button asChild>
            <Link href="/app">Open app</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
        <div className="max-w-2xl space-y-4">
          <Badge variant="secondary">Phase 2 business data</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-pretty">
            Connect the business. Understand the business. Grow the business.
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            GroMogia is a modular platform for small and medium-sized businesses.
            Connect the website and Stripe you already use. Production runs on
            Vercel, not on a laptop.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            title="Vercel"
            ok
            detail="This page is the live GroMogia deployment."
          />
          <StatusCard
            title="Clerk sign-in"
            ok={clerkReady}
            detail={
              clerkReady
                ? "Sign-in is configured."
                : "Add Clerk in the Vercel project, then redeploy."
            }
          />
          <StatusCard
            title="Neon database"
            ok={databaseReady}
            detail={
              databaseReady
                ? "Database is configured."
                : "Add Neon in the Vercel project, then redeploy."
            }
          />
          <StatusCard
            title="Stripe payments"
            ok={stripeReady}
            detail={
              stripeReady
                ? "Stripe keys are present. Connect them inside the app."
                : "Optional for first login. Add test keys when you are ready to sync bookings."
            }
          />
        </div>
      </main>
    </div>
  );
}

function StatusCard({
  title,
  ok,
  detail,
}: {
  title: string
  ok: boolean
  detail: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">{title}</h2>
        <Badge variant={ok ? "secondary" : "outline"}>
          {ok ? "Ready" : "Needed"}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
