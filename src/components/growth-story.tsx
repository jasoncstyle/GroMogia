import Link from "next/link";

import type { GrowthStoryBeat } from "@/lib/growth/story";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GrowthStoryCard({
  beats,
  hideNextStepLink = false,
}: {
  beats: GrowthStoryBeat[]
  hideNextStepLink?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>The path so far</CardTitle>
        <CardDescription>
          Goal, plan, work, what changed, and the next step. GroovGro does not
          run marketing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {beats.map((beat) => (
          <div key={beat.title} className="space-y-2 rounded-lg border p-4">
            <p className="font-medium">{beat.title}</p>
            <p className="text-sm text-muted-foreground">{beat.body}</p>
            {hideNextStepLink && beat.href === "/app/next-step" ? null : (
              <Button asChild variant="outline" size="sm">
                <Link href={beat.href}>
                  {beat.href === "/app/next-step" ? "Open Next step" : "Open"}
                </Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
