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
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-base">{note}</p>
      {extra.map((row) => (
        <p key={row.origin} className="text-base">
          {row.origin}: {row.count}
        </p>
      ))}
      <p className="text-base">
        Open{" "}
        <Link
          href="/app/marketing"
          className="inline-flex min-h-11 items-center underline"
        >
          Marketing
        </Link>{" "}
        to name a share. GroovGro will not buy ads.
      </p>
    </div>
  );
}
