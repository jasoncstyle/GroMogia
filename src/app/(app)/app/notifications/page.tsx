import { OpenNextStepLink } from "@/components/open-next-step-link";

export default function NotificationsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <p className="text-muted-foreground">
        In-app and email notifications will appear here: new leads, failed
        integrations, and later AI recommendations. Preferences come after the
        first real events exist.
      </p>
      <OpenNextStepLink />
    </div>
  );
}
