import {
  confirmGoal,
  confirmOffer,
  rejectGoal,
  rejectOffer,
  reviewConnectedBusiness,
  saveGrowthReview,
} from "@/lib/actions/growth";
import { FoldableSample } from "@/components/foldable-sample";
import type { GrowthReview } from "@/lib/growth/review";
import { labelFor } from "@/lib/growth/types";
import { isSafePublicHttpUrl } from "@/lib/seo/audit";
import { SaveButton, SaveForm } from "@/components/save-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SaveGrowthReviewButton({
  kind,
  canSave,
  nothingYet = false,
  variant = "default",
}: {
  kind: "weekly" | "monthly"
  canSave: boolean
  nothingYet?: boolean
  variant?: "default" | "outline"
}) {
  return (
    <SaveForm
      action={saveGrowthReview}
      successMessage={
        nothingYet
          ? "Review saved. GroovGro recorded that nothing should change yet."
          : "Review saved to Decision History. GroovGro will not execute it."
      }
    >
      <input type="hidden" name="kind" value={kind} />
      <SaveButton type="submit" disabled={!canSave} pendingLabel="Saving…" variant={variant}>
        Save this review to Decision History
      </SaveButton>
    </SaveForm>
  );
}

export function ReviewConnectedDataButton({ disabled }: { disabled?: boolean }) {
  return (
    <SaveForm
      action={reviewConnectedBusiness}
      successMessage="Review finished"
    >
      <SaveButton type="submit" disabled={disabled} pendingLabel="Reviewing…">
        Review connected data
      </SaveButton>
    </SaveForm>
  );
}

export function ConfirmRejectButtons({
  id,
  kind,
}: {
  id: string
  kind: "offer" | "goal"
}) {
  const confirm = kind === "offer" ? confirmOffer : confirmGoal;
  const reject = kind === "offer" ? rejectOffer : rejectGoal;
  return (
    <div className="flex flex-wrap gap-2">
      <SaveForm action={confirm} successMessage={kind === "offer" ? "Offer confirmed" : "Goal confirmed"}>
        <input type="hidden" name="id" value={id} />
        <SaveButton type="submit" size="sm">
          Confirm
        </SaveButton>
      </SaveForm>
      <SaveForm action={reject} successMessage={kind === "offer" ? "Offer rejected" : "Goal rejected"}>
        <input type="hidden" name="id" value={id} />
        <SaveButton type="submit" variant="outline" size="sm">
          Reject
        </SaveButton>
      </SaveForm>
    </div>
  );
}

export function InferredBadge({
  source,
  confidence,
}: {
  source?: string | null
  confidence?: number | null
}) {
  return (
    <p className="text-xs text-muted-foreground">
      Suggested by GroovGro
      {source ? ` from ${labelFor(source)}` : ""}. Not active until you confirm.
      {confidence != null ? ` Confidence ${confidence}.` : ""}
    </p>
  );
}

export function InferredOfferDraft({
  offer,
}: {
  offer: {
    id: string
    name: string
    description: string
    offerType: string
    location: string
    conversionUrl: string
    inferredFrom: string
    confidence: number
  }
}) {
  const pageUrl = isSafePublicHttpUrl(offer.conversionUrl);

  return (
    <FoldableSample
      title={offer.name}
      subtitle="Open to read this draft, then confirm or reject."
    >
      <div className="space-y-3">
        <p className="text-sm whitespace-pre-wrap">
          {offer.description ||
            "No extra description was gathered for this draft."}
        </p>
        {offer.offerType && offer.offerType !== "other" ? (
          <p className="text-sm text-muted-foreground">
            Type: {labelFor(offer.offerType)}
          </p>
        ) : null}
        {offer.location ? (
          <p className="text-sm text-muted-foreground">Location: {offer.location}</p>
        ) : null}
        {pageUrl ? (
          <p className="text-sm">
            <span className="font-medium">Page GroovGro read: </span>
            <a
              href={pageUrl.href}
              className="break-all underline"
              target="_blank"
              rel="noreferrer"
            >
              {pageUrl.href}
            </a>
          </p>
        ) : null}
        <InferredBadge source={offer.inferredFrom} confidence={offer.confidence} />
        <ConfirmRejectButtons id={offer.id} kind="offer" />
      </div>
    </FoldableSample>
  );
}

export function InferredGoalDraft({
  goal,
}: {
  goal: {
    id: string
    title: string
    description: string
    goalType: string
    successDefinition: string
    inferredFrom: string
    confidence: number
  }
}) {
  return (
    <FoldableSample
      title={goal.title}
      subtitle="Open to read this draft, then confirm or reject."
    >
      <div className="space-y-3">
        <p className="text-sm whitespace-pre-wrap">
          {goal.description || "No extra description was gathered for this draft."}
        </p>
        {goal.successDefinition ? (
          <p className="text-sm">
            <span className="font-medium">Success looks like: </span>
            {goal.successDefinition}
          </p>
        ) : null}
        {goal.goalType ? (
          <p className="text-sm text-muted-foreground">
            Type: {labelFor(goal.goalType)}
          </p>
        ) : null}
        <InferredBadge source={goal.inferredFrom} confidence={goal.confidence} />
        <ConfirmRejectButtons id={goal.id} kind="goal" />
      </div>
    </FoldableSample>
  );
}

function classificationLabel(value: string) {
  if (value === "no_change_yet") return "Leave this alone";
  return labelFor(value);
}

export function GrowthReviewCard({
  review,
  canSave,
}: {
  review: GrowthReview
  canSave: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {review.kind === "monthly" ? "Monthly strategy review" : "Weekly growth review"}
        </CardTitle>
        <CardDescription>{review.periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="font-medium">{review.headline}</p>
          <p className="mt-1 text-muted-foreground">{review.summary}</p>
        </div>
        <ReviewSection title="What changed" body={review.whatChanged} />
        <ReviewSection title="How we are doing" body={review.howWeAreDoing} />
        <ReviewSection title="What needs attention" body={review.whatNeedsAttention} />
        <ReviewSection title="What should happen next" body={review.whatShouldHappenNext} />
        <ReviewSection title="What GroovGro is leaving alone" body={review.whatIsLeftAlone} />
        <ReviewSection title="Strategy" body={review.strategyNote} />

        <div className="space-y-3">
          <p className="font-medium">Recommendations</p>
          {review.recommendations.map((item) => (
            <div key={item.title} className="rounded-lg border p-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.kind === "no_change_yet"
                  ? "Leave this alone"
                  : classificationLabel(item.classification)}
                {item.confidence ? ` · confidence ${item.confidence}` : ""}
              </p>
              <p className="mt-1">{item.recommendation}</p>
              <p className="mt-1 text-muted-foreground">{item.rationale}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.evidence}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="font-medium">Evidence windows</p>
          {review.evidenceChecks.map((check) => (
            <p key={check.channel} className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {labelFor(check.channel)}:{" "}
              </span>
              {check.verdict === "no_change_yet" ? "No change yet. " : "Threshold met. "}
              {check.reason}
            </p>
          ))}
        </div>

        <SaveGrowthReviewButton
          kind={review.kind}
          canSave={canSave}
          nothingYet={review.primary.kind === "no_change_yet"}
          variant="outline"
        />
      </CardContent>
    </Card>
  );
}

function ReviewSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}
