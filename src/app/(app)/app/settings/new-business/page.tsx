import { createWorkspace } from "@/lib/actions/workspace";
import { OpenNextStepLink } from "@/components/open-next-step-link";
import { SaveButton } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewBusinessPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add a business</h1>
        <p className="text-muted-foreground">
          GroovGro opens one business at a time. Add the next organization,
          then connect its website, Search Console, and Analytics from that
          workspace. Do not mix brands on one screen.
        </p>
      </div>

      <form action={createWorkspace} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Business name</Label>
          <Input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            autoComplete="organization"
            placeholder="Business name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="publicUrl">Website (optional)</Label>
          <Input
            id="publicUrl"
            name="publicUrl"
            inputMode="url"
            maxLength={500}
            placeholder="https://www.example.com"
          />
          <p className="text-sm text-muted-foreground">
            You can add the public site now or on Website connection after
            this business is open.
          </p>
        </div>
        <SaveButton pendingLabel="Adding…">Add this business</SaveButton>
      </form>

      <OpenNextStepLink />
    </div>
  );
}
