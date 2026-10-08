import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  labelEvidence,
  type EvidenceKind,
} from "@/lib/owner-surface/boards";

export function OwnerPage({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-5", className)}>
      {children}
    </div>
  );
}

export function OwnerIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      {eyebrow ? (
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
      {children ? (
        <div className="text-base leading-relaxed text-muted-foreground">{children}</div>
      ) : null}
    </div>
  );
}

export function EvidenceBadge({ kind }: { kind: EvidenceKind }) {
  return (
    <Badge variant="outline" className="font-normal">
      {labelEvidence(kind)}
    </Badge>
  );
}

export function OwnerCard({
  eyebrow,
  title,
  description,
  evidence,
  action,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  evidence?: EvidenceKind
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            {eyebrow ? (
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {eyebrow}
              </p>
            ) : null}
            <CardTitle className="text-xl text-balance">{title}</CardTitle>
          </div>
          {evidence ? <EvidenceBadge kind={evidence} /> : null}
        </div>
        {description ? <CardDescription className="text-sm leading-relaxed">{description}</CardDescription> : null}
      </CardHeader>
      {children || action ? (
        <CardContent className="space-y-4">
          {children}
          {action}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function OwnerActionLink({
  href,
  children,
  variant = "default",
}: {
  href: string
  children: React.ReactNode
  variant?: "default" | "outline"
}) {
  return (
    <Button asChild variant={variant} size="lg" className="h-11">
      <Link href={href}>{children}</Link>
    </Button>
  );
}
