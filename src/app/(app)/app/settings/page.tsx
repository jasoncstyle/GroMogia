import Link from "next/link";

import { Button } from "@/components/ui/button";
import { OpenNextStepLink } from "@/components/open-next-step-link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization settings
        </h1>
        <p className="text-muted-foreground">
          Central settings other modules should reuse, not copy. Switch
          businesses from the name under GroovGro in the sidebar, or add
          another business. GroovGro opens one business at a time.
        </p>
      </div>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Another business</CardTitle>
            <CardDescription>
              Add a separate organization. GroovGro will open that workspace
              and keep this one&apos;s data apart.
            </CardDescription>
            <Button asChild className="w-fit">
              <Link href="/app/settings/new-business">Add a business</Link>
            </Button>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Refresh schedules</CardTitle>
            <CardDescription>
              Choose how often GroovGro pulls Search Console, Analytics, the
              website, or Stripe copies. Refresh buttons stay on each page.
            </CardDescription>
            <Button asChild className="w-fit">
              <Link href="/app/settings/schedules">Set refresh schedules</Link>
            </Button>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Business</CardTitle>
            <CardDescription>
              Structured understanding of the organization: model, locations,
              constraints, and how sure GroovGro is.
            </CardDescription>
            <Button asChild className="w-fit">
              <Link href="/app/business">Edit Business Brain</Link>
            </Button>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Brand</CardTitle>
            <CardDescription>
              Name, description, and who you serve. Website, email, and ads
              should all read from here later.
            </CardDescription>
            <Button asChild className="w-fit">
              <Link href="/app/settings/brand">Edit brand</Link>
            </Button>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>
              Roles are stored as permissions, not hard-coded job titles.
            </CardDescription>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/app/settings/team">View roles</Link>
            </Button>
          </CardHeader>
        </Card>
      </div>

      <OpenNextStepLink />
    </div>
  );
}
