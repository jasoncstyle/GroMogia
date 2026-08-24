import Link from "next/link";

import { Button } from "@/components/ui/button";

export function OpenNextStepLink() {
  return (
    <Button asChild variant="outline">
      <Link href="/app/next-step">Open Next step</Link>
    </Button>
  );
}
