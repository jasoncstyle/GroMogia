import { describeSearchLoopTrail, type SearchLoopStep } from "@/lib/growth/search-loop";

export function SearchLoopTrail({ step }: { step: SearchLoopStep }) {
  const trail = describeSearchLoopTrail(step);
  const doneCount = trail.filter((item) => item.done).length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        You did {doneCount} of {trail.length} steps.
      </p>
      <ol className="space-y-1">
        {trail.map((item) => (
          <li
            key={item.title}
            className={
              item.done
                ? "text-sm text-foreground"
                : "text-sm text-muted-foreground"
            }
          >
            {item.done ? "Done · " : "Waiting · "}
            {item.title}
          </li>
        ))}
      </ol>
    </div>
  );
}
