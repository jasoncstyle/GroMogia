import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import { missingFoundationServices } from "@/lib/env";

export default async function DashboardPage() {
  const session = await getAppSession();
  const missing = missingFoundationServices();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          GroMogia answers four questions. Charts wait until real business data
          is connected in Phase 2.
        </p>
      </div>

      {missing.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Finish cloud setup</CardTitle>
            <CardDescription>
              This site is live on Vercel. Add these hosted services in the
              Vercel project, then redeploy. Do not install them on your computer.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {missing.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {session.organizationName ?? "Your organization"}
            </CardTitle>
            <CardDescription>
              Signed in as {session.email}. Foundation modules are on: brand,
              integrations, and media.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <QuestionCard
          title="What is happening?"
          body="No connected website, leads, or Stripe data yet. Phase 2 will show activity from a real Mogia Group business."
        />
        <QuestionCard
          title="Why is it happening?"
          body="Context needs marketing, website, and payment sources. Those adapters are not enabled in Phase 1."
        />
        <QuestionCard
          title="What needs attention?"
          body={
            missing.length > 0
              ? "Connect Clerk and Neon so people can sign in and organizations can be stored."
              : "Invite your team and complete brand settings so later modules have a single source of truth."
          }
        />
        <QuestionCard
          title="What should I do next?"
          body="Open Brand settings, then Integrations. Leave the website builder off until the core platform is useful."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/app/settings/brand">Brand settings</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/integrations">Integrations</Link>
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
