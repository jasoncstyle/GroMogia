import { getAppSession } from "@/lib/auth/session";
import { getCoordinatedNextStep } from "@/lib/growth/queries";
import {
  OwnerActionLink,
  OwnerCard,
  OwnerIntro,
  OwnerPage,
} from "@/components/owner-surface/surface";
import { growBoards } from "@/lib/owner-surface/boards";

export default async function GrowPage() {
  const session = await getAppSession();
  const nextStep = session.organizationId
    ? await getCoordinatedNextStep(session.organizationId)
    : null;
  const watchingQueries = (nextStep?.searchLoop?.candidates ?? [])
    .filter((row) => row.opportunityLabel === "watch")
    .map((row) => ({
      query: row.query,
      why: "GroovGro is watching this stored search. There is not enough evidence yet to treat it as the next move.",
    }));
  const boards = growBoards({
    primary: nextStep?.primary
      ? {
          title: nextStep.primary.title,
          body: nextStep.primary.body,
          href: "/app/grow/do",
        }
      : null,
    waitingActions: nextStep?.waitingActions,
    openWork: nextStep?.openWork,
    weeklyRecommendations: nextStep?.weeklyLook?.recommendations.map((item) => ({
      title: item.title,
      recommendation: item.recommendation,
    })),
    searchWatching: watchingQueries,
  });

  return (
    <OwnerPage>
      <OwnerIntro title="Grow">
        <p>
          One best next move for this business. GroovGro prepares the suggestion.
          You decide. Nothing goes live from this page.
        </p>
      </OwnerIntro>

      <OwnerCard
        eyebrow="Best Next Move"
        title={boards.best?.title ?? "No next move yet"}
        description={
          boards.best?.body ??
          "When stored Goals, people, or website reads point to a useful step, it will show here."
        }
        action={
          boards.best ? (
            <OwnerActionLink href="/app/grow/do">Let&apos;s do this</OwnerActionLink>
          ) : (
            <OwnerActionLink href="/app/business" variant="outline">
              Add what GroovGro should know
            </OwnerActionLink>
          )
        }
      />

      {boards.also.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Also worth doing
          </h2>
          {boards.also.map((item) => (
            <OwnerCard
              key={item.id}
              title={item.title}
              description={item.body}
              action={
                <OwnerActionLink href={item.href} variant="outline">
                  Open
                </OwnerActionLink>
              }
            />
          ))}
        </div>
      ) : null}

      {boards.watching.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Watching
          </h2>
          {boards.watching.map((item) => (
            <OwnerCard key={item.id} title={item.title} description={item.body} />
          ))}
        </div>
      ) : null}
    </OwnerPage>
  );
}
