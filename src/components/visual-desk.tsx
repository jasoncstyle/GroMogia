import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DeskKpi({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/8">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {icon ? (
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function DeskRing({
  percent,
  label,
  caption,
}: {
  percent: number | null
  label: string
  caption: string
}) {
  const shown = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (shown / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
      <p className="self-start text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="relative size-40">
        <svg
          viewBox="0 0 120 120"
          className="size-full -rotate-90"
          role="img"
          aria-label={
            percent == null
              ? "Goal progress is not computed yet"
              : `Goal progress ${shown} percent`
          }
        >
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth="10"
          />
          {percent != null ? (
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              className="stroke-primary"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-semibold tabular-nums">
            {percent == null ? "—" : `${shown}%`}
          </p>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

export function DeskSparkline({
  values,
  label,
}: {
  values: number[]
  label: string
}) {
  if (values.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        No stored Goal snapshots yet. The line appears after GroovGro records
        progress.
      </p>
    );
  }
  const width = 320;
  const height = 96;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 12) - 6;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-24 w-full"
      role="img"
      aria-label={label}
    >
      <polyline points={area} className="fill-primary/10" stroke="none" />
      <polyline
        points={points}
        fill="none"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DeskBars({
  rows,
  empty,
}: {
  rows: { label: string; value: number; hint?: string }[]
  empty: string
}) {
  const max = Math.max(...rows.map((row) => row.value), 0);
  if (rows.length === 0 || max === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((row, index) => (
        <li key={`${row.label}-${index}`} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {row.hint ?? row.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                index === 0 ? "bg-primary" : "bg-primary/45",
              )}
              style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DeskSplit({
  rows,
  empty,
}: {
  rows: { label: string; value: number; tone: "one" | "two" | "three" }[]
  empty: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums">{row.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{row.label}</p>
          <div
            className={cn(
              "mt-3 h-1 rounded-full",
              row.tone === "one" && "bg-emerald-500",
              row.tone === "two" && "bg-sky-500",
              row.tone === "three" && "bg-amber-500",
            )}
          />
        </div>
      ))}
    </div>
  );
}
