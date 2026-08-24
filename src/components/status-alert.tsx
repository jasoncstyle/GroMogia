import Link from "next/link";

import {
  CircleCheckIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";

import type { StatusAlertItem, StatusAlertTone } from "@/lib/growth/status-alerts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const toneStyles: Record<
  StatusAlertTone,
  { className: string; icon: typeof CircleCheckIcon; live: "polite" | "assertive" }
> = {
  ok: {
    className:
      "border-emerald-600/30 bg-emerald-50 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-950/50 dark:text-emerald-50",
    icon: CircleCheckIcon,
    live: "polite",
  },
  wait: {
    className:
      "border-amber-600/30 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-50",
    icon: TriangleAlertIcon,
    live: "polite",
  },
  problem: {
    className:
      "border-red-600/30 bg-red-50 text-red-950 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-50",
    icon: OctagonXIcon,
    live: "assertive",
  },
};

export function StatusAlert({
  tone,
  title,
  body,
  href,
}: Pick<StatusAlertItem, "tone" | "title" | "body" | "href">) {
  const style = toneStyles[tone];
  const Icon = style.icon;

  return (
    <div
      role={tone === "problem" ? "alert" : "status"}
      aria-live={style.live}
      data-tone={tone}
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3",
        style.className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 space-y-2">
        <div className="space-y-1">
          <p className="font-medium leading-snug">{title}</p>
          <p className="text-sm leading-relaxed opacity-90">{body}</p>
        </div>
        {href ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href}>
              {href === "/app/next-step" ? "Open Next step" : "Open"}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function StatusAlertList({ alerts }: { alerts: StatusAlertItem[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <StatusAlert
          key={alert.id}
          tone={alert.tone}
          title={alert.title}
          body={alert.body}
          href={alert.href}
        />
      ))}
    </div>
  );
}
