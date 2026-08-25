import Link from "next/link";

export function GoalShareNote({
  note,
  rows = [],
}: {
  note: string
  rows?: { origin: string; count: number }[]
}) {
  if (!note) return null;
  const extra = rows.slice(1);
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{note}</p>
      {extra.map((row) => (
        <p key={row.origin} className="text-sm text-muted-foreground">
          {row.origin}: {row.count}
        </p>
      ))}
      <p className="text-sm text-muted-foreground">
        Open{" "}
        <Link href="/app/marketing" className="underline">
          Marketing
        </Link>{" "}
        to name a share. GroovGro will not buy ads.
      </p>
    </div>
  );
}
