import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WebsiteUpdateExpectation({
  compact = false,
}: {
  compact?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {compact ? "Website updates" : "How GroovGro updates a website"}
        </CardTitle>
        <CardDescription>
          GroovGro checks the connected site and drafts changes for you to
          approve. It does not silently rewrite the live site.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          If you use the GroovGro website builder, WordPress, or a similar
          platform with an official connection, approved updates can be applied
          automatically when that connection exists.
        </p>
        <p>
          Otherwise you apply approved updates yourself. GroovGro will show
          what to change and where — for example a title tag, meta description,
          or file on the connected site.
        </p>
        {compact ? null : (
          <p>
            Today: approved title, description, and heading drafts can be applied
            to the GroovGro page they belong to (Home or an extra page).
            Connected custom sites still need a manual paste. GroovGro does not
            overwrite Stripe checkout.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
