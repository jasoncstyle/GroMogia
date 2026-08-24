import Link from "next/link";

import { saveSpecialistRecommendation } from "@/lib/actions/specialists";
import type { SpecialistReport } from "@/lib/growth/specialists";
import { labelFor } from "@/lib/growth/types";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SpecialistReports({
  reports,
  canSave,
}: {
  reports: SpecialistReport[]
  canSave: boolean
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Specialists</h2>
        <p className="text-sm text-muted-foreground">
          Each specialist can read connected data, analyze it against a Goal,
          and recommend a next step — including leaving the channel alone.
          None of them can execute.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle className="text-base">{report.name}</CardTitle>
              <CardDescription>
                {report.relatedGoal
                  ? `Goal: ${report.relatedGoal.title}`
                  : "No matching active Goal yet"}
                {report.available ? "" : " · not connected"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Section label="What GroovGro can see" body={report.read} />
              <Section label="What that means" body={report.analyze} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {report.recommend.kind === "no_change_yet"
                    ? "Leave this alone"
                    : labelFor(report.recommend.classification)}
                </p>
                <p className="font-medium">{report.recommend.title}</p>
                <p className="text-muted-foreground">{report.recommend.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={report.recommend.href}>
                      {report.recommend.href === "/app/next-step"
                        ? "Open Next step"
                        : "Open related page"}
                    </Link>
                  </Button>
                  <SaveForm
                    action={saveSpecialistRecommendation}
                    successMessage={
                      report.recommend.kind === "no_change_yet"
                        ? `${report.name} recommendation saved: leave this alone. GroovGro will not execute it.`
                        : `${report.name} recommendation saved. GroovGro will not execute it.`
                    }
                  >
                    <input type="hidden" name="specialistId" value={report.id} />
                    <SaveButton type="submit" size="sm" disabled={!canSave}>
                      Save to Decision History
                    </SaveButton>
                  </SaveForm>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}
