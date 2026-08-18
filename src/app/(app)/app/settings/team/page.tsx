import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_PERMISSIONS, SYSTEM_ROLES } from "@/lib/permissions";

export default function TeamSettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team roles</h1>
        <p className="text-muted-foreground">
          Permissions are checked on the server. These templates can be
          customized later without rewriting the app.
        </p>
      </div>
      <div className="grid gap-3">
        {SYSTEM_ROLES.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="capitalize">
                {role.replaceAll("_", " ")}
              </CardTitle>
              <CardDescription>
                {ROLE_PERMISSIONS[role].join(", ")}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
