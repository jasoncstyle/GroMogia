import Link from "next/link";

import { runSeoAudit } from "@/lib/actions/seo";
import { getAppSession } from "@/lib/auth/session";
import { getSeoPageData } from "@/lib/phase6/queries";
import { FoldableSample } from "@/components/foldable-sample";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SeoPage() {
  const session = await getAppSession();
  const data = session.organizationId
    ? await getSeoPageData(session.organizationId)
    : null;
  const latest = data?.audits[0] ?? null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SEO</h1>
        <p className="text-muted-foreground">
          A first technical check of the connected website. GroovGro will not
          edit the site, buy ads, or change Stripe checkout. Search Console
          comes later.
        </p>
      </div>

      {!data || !session.organizationId ? (
        <p className="text-sm text-muted-foreground">
          Sign in to check the connected website.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Connected homepage</CardTitle>
              <CardDescription>
                {data.website?.publicUrl
                  ? data.website.publicUrl
                  : "No website is connected yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {data.website?.publicUrl ? (
                <SaveForm action={runSeoAudit} successMessage="Check saved.">
                  <SaveButton pendingLabel="Checking…">Run homepage check</SaveButton>
                </SaveForm>
              ) : (
                <Button asChild>
                  <Link href="/app/website">Connect website</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {latest ? (
            <Card>
              <CardHeader>
                <CardTitle>Latest score: {latest.score}</CardTitle>
                <CardDescription>
                  {latest.createdAt.toLocaleString()} · {latest.url}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{latest.summary}</p>
                {latest.findings.map((finding) => (
                  <FoldableSample
                    key={finding.id}
                    title={finding.title}
                    subtitle={severityLabel(finding.severity)}
                  >
                    <p className="text-sm text-muted-foreground">{finding.detail}</p>
                    <p className="text-sm">{finding.recommendation}</p>
                  </FoldableSample>
                ))}
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run a check to see titles, descriptions, headings, robots.txt, and
              sitemap on the connected homepage.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function severityLabel(severity: "ok" | "warn" | "fail") {
  if (severity === "fail") return "Needs a fix";
  if (severity === "warn") return "Could be clearer";
  return "Looks good";
}
