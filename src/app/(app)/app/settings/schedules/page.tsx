import { getAppSession } from "@/lib/auth/session";
import { listTaskSchedules } from "@/lib/jobs/query";
import { OpenNextStepLink } from "@/components/open-next-step-link";
import { TaskScheduleForm } from "@/components/task-schedule-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function RefreshSchedulesPage() {
  const session = await getAppSession();
  const schedules = session.organizationId
    ? await listTaskSchedules(session.organizationId)
    : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Refresh schedules
        </h1>
        <p className="text-muted-foreground">
          GroovGro can refresh stored copies on a timer. Each feature still has
          its own refresh button. This does not publish, send email, post, or
          buy ads. One business at a time.
        </p>
      </div>

      {schedules.map((schedule) => (
        <Card key={schedule.taskKey}>
          <CardHeader>
            <CardTitle>
              {schedule.section}: {schedule.name}
            </CardTitle>
            <CardDescription>{schedule.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <TaskScheduleForm taskKey={schedule.taskKey} />
          </CardContent>
        </Card>
      ))}

      <OpenNextStepLink />
    </div>
  );
}
