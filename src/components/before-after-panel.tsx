import { type BeforeAfterView } from "@/lib/growth/before-after";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BeforeAfterPanel({
  looks,
}: {
  looks: BeforeAfterView[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What a stored before and after shows</CardTitle>
        <CardDescription>
          These looks compare the first stored Goal number to the latest
          stored Goal number. This is not an experiment GroovGro ran.
          GroovGro will not buy ads, change the plan, or treat one move as
          proof.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {looks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Save a Goal number at least twice before GroovGro can show a
            before and after. GroovGro will not guess.
          </p>
        ) : (
          looks.map((row) => (
            <div key={row.goalId} className="space-y-1">
              <p className="text-sm font-medium">
                {row.title} · {row.statusTitle}
              </p>
              <p className="text-sm text-muted-foreground">{row.why}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
