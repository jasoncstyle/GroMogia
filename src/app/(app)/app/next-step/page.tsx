import Link from "next/link";

import { ConfirmRejectButtons, InferredBadge, ReviewConnectedDataButton, SaveGrowthReviewButton } from "@/components/growth-review";
import { DraftGrowthPlanButton, GrowthPlanReviewButtons, ProposePlanActionsButton } from "@/components/growth-plan-actions";
import { ActivateGoalButton, DraftNextGoalButton } from "@/components/next-goal-actions";
import { NextStepResponseButtons, OpenPageNextStepButtons, WaitingActionButtons } from "@/components/next-step-actions";
import { OwnerWorkButtons, CheckWhatChangedButton } from "@/components/owner-work-actions";
import { DraftSeoImprovementsButton, RunHomepageSeoButton, SeoDraftDecisionButtons } from "@/components/seo-actions";
import { FoldableSample } from "@/components/foldable-sample";
import { EventCreateForm } from "@/components/event-create-form";
import { BrandVoiceDraftForm } from "@/components/brand-voice-draft-form";
import { BrandVoiceExampleForm } from "@/components/brand-voice-example-form";
import { BrandVoiceProfileForm } from "@/components/brand-voice-profile-form";
import { BrandSettingsForm } from "@/components/brand-settings-form";
import { BusinessBrainForm } from "@/components/business-brain-form";
import { OfferCreateForm } from "@/components/offer-create-form";
import { GoalCreateForm } from "@/components/goal-create-form";
import { LeadCreateForm } from "@/components/lead-create-form";
import { LeadFollowUpButtons } from "@/components/lead-follow-up";
import { CopyLink } from "@/components/copy-link";
import { SearchConsolePanel, searchConsoleNotice } from "@/components/search-console-panel";
import { TrackingSnippet } from "@/components/tracking-snippet";
import { SaveConnectedProgressButton } from "@/components/save-connected-progress-button";
import { StripeReadCopyPanel } from "@/components/stripe-read-copy-panel";
import { GrowthSettingsForm } from "@/components/growth-settings-form";
import { WebsiteConnectForm } from "@/components/website-connect-form";
import { WebsitePageChecklist } from "@/components/website-page-checklist";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { getBrandSettingsForm, getBusinessBrainForm, getCoordinatedNextStep, getDiscoveredWebsitePages, getGrowthLinkOptions, getGrowthSettingsForm } from "@/lib/growth/queries";
import { getSeoPageData } from "@/lib/phase6/queries";
import { hrefForGrowthAction } from "@/lib/growth/owner-work";
import { resolveOrganizationSlug } from "@/lib/org";
import { ACTIVATE_GOAL_STEP_TITLE, APPROVE_ACTIONS_STEP_TITLE, APPROVE_PLAN_STEP_TITLE, CHECK_CHANGED_STEP_TITLE, CONFIRM_DRAFTS_STEP_TITLE, CONNECT_STRIPE_STEP_TITLE, CONNECT_WEBSITE_STEP_TITLE, DRAFT_PLAN_STEP_TITLE, GOAL_REACHED_STEP_TITLE, hasDedicatedNextStepControls, isAddBrandVoiceExampleNextStep, isAddGoalNextStep, isAddOfferNextStep, isDraftBrandVoiceNextStep, isFollowUpLeadsNextStep, isPasteSnippetNextStep, isReadGoalNextStep, isReviewScheduleNextStep, isSaveBrandNextStep, isSaveBrandVoiceNextStep, isSaveBusinessNextStep, isSaveProgressNextStep, isSaveReviewScheduleNextStep, isSearchConsoleNextStep, isSeoDraftNextStep, isShareLeadFormNextStep, isStripeReadCopyNextStep, openPageLabelForNextStep, OWNER_WORK_STEP_TITLE, PROPOSE_ACTIONS_STEP_TITLE, REVIEW_SITE_STEP_TITLE, RUN_SEO_STEP_TITLE, showsDedicatedNextStepControl } from "@/lib/growth/plan-draft";
import { labelFor } from "@/lib/growth/types";
import { hasPermission } from "@/lib/permissions";
import { getDashboardSnapshot } from "@/lib/phase2/queries";

export default async function NextStepPage({
  searchParams,
}: {
  searchParams: Promise<{ gsc?: string; error?: string }>
}) {
  const params = await searchParams;
  const session = await getAppSession();
  const [step, dashboard, links, slug] = session.organizationId
    ? await Promise.all([
        getCoordinatedNextStep(session.organizationId),
        getDashboardSnapshot(session.organizationId),
        getGrowthLinkOptions(session.organizationId),
        resolveOrganizationSlug(session.organizationId, session.organizationSlug),
      ])
    : [null, null, { offers: [], goals: [] }, ""];
  const canDecide = hasPermission(session.permissions, "view_decision_history");
  const canCheck = canDecide;
  const canApprove = hasPermission(session.permissions, "approve_actions");
  const canCreateGoal = hasPermission(session.permissions, "create_goals");
  const canActivateGoal = hasPermission(session.permissions, "modify_goals");
  const canDraftPlan = hasPermission(session.permissions, "modify_goals");
  const canUpdateWork = canDraftPlan;
  const canApprovePlan = hasPermission(session.permissions, "approve_plans");
  const canManageWebsite = hasPermission(session.permissions, "manage_website");
  const canManageEvents = hasPermission(session.permissions, "manage_events");
  const canManageLeads = hasPermission(session.permissions, "manage_leads");
  const canManageCustomers = hasPermission(session.permissions, "manage_customers");
  const canManageBrand = hasPermission(session.permissions, "manage_brand");
  const canManageSettings = hasPermission(session.permissions, "manage_settings");
  const canManageOffers = hasPermission(session.permissions, "manage_offers");
  const canManageSeo = hasPermission(session.permissions, "manage_seo");
  const canConnectSearchConsole =
    canManageSeo || hasPermission(session.permissions, "manage_integrations");
  const canManageIntegrations = hasPermission(session.permissions, "manage_integrations");
  const openPageLabel = step ? openPageLabelForNextStep(step.primary.title) : null;
  const dedicatedVisible = step
    ? showsDedicatedNextStepControl(step.primary.title, {
        canCreateGoal,
        canActivateGoal,
        canDraftPlan,
        goalId: step.primary.goalId,
        planId: step.primary.planId,
      })
    : false;
  const snippet = dashboard?.website?.trackingId
    ? `<script src="${appUrl()}/t.js" data-groovgro-id="${dashboard.website.trackingId}" data-gromogia-id="${dashboard.website.trackingId}" async></script>`
    : "";
  const leadFormUrl = slug ? `${appUrl()}/l/${slug}` : "";
  const gscNotice = searchConsoleNotice(params.gsc, params.error);
  const searchConsole =
    session.organizationId && step && isSearchConsoleNextStep(step.primary.title)
      ? (await getSeoPageData(session.organizationId)).searchConsole
      : null;
  const brand =
    session.organizationId && step && isSaveBrandNextStep(step.primary.title)
      ? await getBrandSettingsForm(session.organizationId)
      : null;
  const brain =
    session.organizationId && step && isSaveBusinessNextStep(step.primary.title)
      ? await getBusinessBrainForm(session.organizationId)
      : null;
  const growthSettings =
    session.organizationId && step && isSaveReviewScheduleNextStep(step.primary.title)
      ? await getGrowthSettingsForm(session.organizationId)
      : null;
  const discoveredPages =
    session.organizationId && step?.primary.title === REVIEW_SITE_STEP_TITLE
      ? await getDiscoveredWebsitePages(session.organizationId)
      : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Next step</h1>
        <p className="text-muted-foreground">
          GroovGro reads your Goals, specialists, and connected data, then
          names one thing to do — or says to wait. You decide. GroovGro does
          not run marketing, send email, change ads, or edit the live website.
        </p>
      </div>

      {!step ? (
        <p className="text-sm text-muted-foreground">
          Sign in to see the next step for this business.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{step.primary.title}</CardTitle>
              <CardDescription>
                {step.primary.kind === "no_change_yet"
                  ? "No change is the recommendation."
                  : `${labelFor(step.primary.classification)} · from ${step.primary.source === "drafts" ? "Business drafts" : step.primary.source === "specialist" ? "a specialist" : step.primary.source === "owner_work" ? "Your work" : step.primary.source === "learning" ? "what changed" : step.primary.source === "goals" ? "Goals" : step.primary.source === "website" ? "the connected website" : "the growth review"}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{step.primary.body}</p>
              {gscNotice && !isSearchConsoleNextStep(step.primary.title) ? (
                <p className="text-sm text-muted-foreground">{gscNotice}</p>
              ) : null}
              {step.primary.title === CONFIRM_DRAFTS_STEP_TITLE ? (
                step.inferredDrafts.map((draft) => (
                  <div key={draft.id} className="space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{draft.title}</p>
                    {draft.description ? (
                      <p className="text-muted-foreground">
                        {draft.description.length > 280
                          ? `${draft.description.slice(0, 279).trimEnd()}…`
                          : draft.description}
                      </p>
                    ) : null}
                    <InferredBadge
                      source={draft.inferredFrom}
                      confidence={draft.confidence}
                    />
                    <ConfirmRejectButtons id={draft.id} kind={draft.kind} />
                  </div>
                ))
              ) : step.primary.title === APPROVE_ACTIONS_STEP_TITLE ? (
                step.waitingActions.map((action) => (
                  <div key={action.id} className="space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{action.description}</p>
                    <p className="text-muted-foreground">
                      {action.status} · {labelFor(action.risk)}
                      {action.module ? ` · ${action.module}` : ""}
                    </p>
                    <WaitingActionButtons
                      actionId={action.id}
                      canApprove={canApprove}
                    />
                  </div>
                ))
              ) : step.primary.title === OWNER_WORK_STEP_TITLE ? (
                step.openWork.map((action) => (
                  <div key={action.id} className="space-y-3 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{action.description}</p>
                    <p className="text-muted-foreground">
                      {labelFor(action.risk)}
                      {action.module ? ` · ${labelFor(action.module)}` : ""}
                    </p>
                    <OwnerWorkButtons
                      actionId={action.id}
                      href={hrefForGrowthAction(action)}
                      canUpdate={canUpdateWork}
                      showOpenPage={false}
                    />
                  </div>
                ))
              ) : step.primary.title === CHECK_CHANGED_STEP_TITLE ? (
                step.uncheckedWork.map((action) => (
                  <div key={action.id} className="space-y-3 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{action.description}</p>
                    <CheckWhatChangedButton
                      actionId={action.id}
                      canCheck={canCheck}
                    />
                  </div>
                ))
              ) : step.primary.title === CONNECT_WEBSITE_STEP_TITLE ? (
                <>
                  <WebsiteConnectForm
                    defaultUrl={dashboard?.website?.publicUrl ?? ""}
                    canSave={canManageWebsite}
                  />
                </>
              ) : step.primary.title === REVIEW_SITE_STEP_TITLE ? (
                <>
                  <WebsitePageChecklist
                    pages={discoveredPages}
                    disabled={!canManageWebsite && !canManageOffers}
                  />
                  <ReviewConnectedDataButton disabled={!session.organizationId} />
                </>
              ) : isPasteSnippetNextStep(step.primary.title) ? (
                <>
                  {snippet ? (
                    <TrackingSnippet snippet={snippet} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Save the website address first, then copy the snippet.
                      GroovGro does not replace the live site.
                    </p>
                  )}
                </>
              ) : step.primary.title === RUN_SEO_STEP_TITLE ? (
                <RunHomepageSeoButton disabled={!canManageSeo} />
              ) : isSearchConsoleNextStep(step.primary.title) ? (
                <>
                  {searchConsole ? (
                    <SearchConsolePanel
                      searchConsole={searchConsole}
                      notice={gscNotice}
                      embedded
                      canManage={canConnectSearchConsole}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Search Console is not ready on this page yet. GroovGro
                      will not edit the website.
                    </p>
                  )}
                </>
              ) : isSeoDraftNextStep(step.primary.title) ? (
                <>
                  {step.seoDrafts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Draft the title and description changes here, then
                      approve them. GroovGro does not paste them onto the live
                      site.
                    </p>
                  ) : null}
                  {step.seoDrafts.map((draft) => (
                    <FoldableSample key={draft.id} title={draft.title} subtitle="Waiting">
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                        {draft.proposedChange}
                      </pre>
                      {draft.howToApply ? (
                        <p className="text-sm text-muted-foreground">{draft.howToApply}</p>
                      ) : null}
                      <SeoDraftDecisionButtons
                        draftId={draft.id}
                        proposedChange={draft.proposedChange}
                        disabled={!canManageSeo}
                      />
                    </FoldableSample>
                  ))}
                  <DraftSeoImprovementsButton disabled={!canManageSeo} />
                </>
              ) : isReviewScheduleNextStep(step.primary.title) ? (
                <>
                  {dashboard?.upcomingEvents.length ? (
                    <ul className="space-y-2 text-sm">
                      {dashboard.upcomingEvents.map((event) => (
                        <li key={event.id}>
                          <span className="font-medium">{event.title}</span>
                          <span className="text-muted-foreground">
                            {event.startsAt
                              ? ` · ${event.startsAt.toLocaleString()}`
                              : " · Date not set"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No upcoming calendar items yet. Add one here if that is
                      how this business sells.
                    </p>
                  )}
                  <EventCreateForm
                    offers={links.offers}
                    goals={links.goals}
                    disabled={!canManageEvents}
                  />
                </>
              ) : isFollowUpLeadsNextStep(step.primary.title) ? (
                <>
                  {leadFormUrl ? <CopyLink url={leadFormUrl} /> : null}
                  {step.openLeads.map((lead) => (
                    <div key={lead.id} className="space-y-2 rounded-lg border p-4 text-sm">
                      <p className="font-medium">
                        {lead.name || lead.email || "Unnamed person"}
                      </p>
                      <p className="text-muted-foreground">
                        {lead.stageName}
                        {lead.email ? ` · ${lead.email}` : ""}
                        {lead.source ? ` · ${lead.source}` : ""}
                      </p>
                      <LeadFollowUpButtons
                        leadId={lead.id}
                        stageId={lead.stageId}
                        stages={step.leadStages}
                        canMove={canManageLeads}
                        canConvert={canManageCustomers}
                        isWon={lead.isWon}
                      />
                    </div>
                  ))}
                </>
              ) : isShareLeadFormNextStep(step.primary.title) ? (
                <>
                  {leadFormUrl ? (
                    <CopyLink url={leadFormUrl} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      The public lead form is not ready on this page yet.
                      GroovGro will not email anyone.
                    </p>
                  )}
                  <p className="text-sm font-medium">
                    Or add someone you already know
                  </p>
                  <LeadCreateForm
                    offers={links.offers}
                    goals={links.goals}
                    disabled={!canManageLeads}
                  />
                </>
              ) : isSaveBrandNextStep(step.primary.title) ? (
                <>
                  <BrandSettingsForm
                    brand={brand}
                    organizationName={session.organizationName}
                    disabled={!canManageBrand}
                  />
                </>
              ) : isSaveBusinessNextStep(step.primary.title) ? (
                <>
                  <BusinessBrainForm
                    brain={brain}
                    disabled={!canManageSettings}
                  />
                </>
              ) : isSaveProgressNextStep(step.primary.title) ? (
                <>
                  <SaveConnectedProgressButton disabled={!canDraftPlan} />
                </>
              ) : isStripeReadCopyNextStep(step.primary.title) ? (
                <>
                  <StripeReadCopyPanel
                    configured={dashboard?.stripeConfigured ?? false}
                    connected={dashboard?.stripeConnected ?? false}
                    lastError={dashboard?.stripeLastError}
                    canManage={canManageIntegrations}
                    mode={
                      step.primary.title === CONNECT_STRIPE_STEP_TITLE
                        ? "connect"
                        : "sync"
                    }
                  />
                </>
              ) : isSaveReviewScheduleNextStep(step.primary.title) ? (
                <>
                  <GrowthSettingsForm
                    settings={growthSettings}
                    disabled={!canManageSettings}
                  />
                </>
              ) : isSaveBrandVoiceNextStep(step.primary.title) ? (
                <>
                  <BrandVoiceProfileForm disabled={!canManageBrand} />
                </>
              ) : isAddBrandVoiceExampleNextStep(step.primary.title) ? (
                <>
                  <BrandVoiceExampleForm disabled={!canManageBrand} />
                </>
              ) : isDraftBrandVoiceNextStep(step.primary.title) ? (
                <>
                  <BrandVoiceDraftForm disabled={!canManageBrand} />
                </>
              ) : isAddOfferNextStep(step.primary.title) ? (
                <>
                  <OfferCreateForm disabled={!canManageOffers} />
                </>
              ) : isAddGoalNextStep(step.primary.title) ? (
                <>
                  <GoalCreateForm
                    offers={links.offers}
                    disabled={!canCreateGoal}
                  />
                </>
              ) : isReadGoalNextStep(step.primary.title) ? (
                <>
                  {step.learningGoal ? (
                    <div className="space-y-1 rounded-lg border p-4 text-sm">
                      <p className="font-medium">{step.learningGoal.title}</p>
                      <p>
                        {step.learningGoal.unit
                          ? `${step.learningGoal.liveCurrentValue} ${step.learningGoal.unit}`
                          : String(step.learningGoal.liveCurrentValue)}
                        {step.learningGoal.targetValue != null
                          ? ` of ${
                              step.learningGoal.unit
                                ? `${step.learningGoal.targetValue} ${step.learningGoal.unit}`
                                : String(step.learningGoal.targetValue)
                            }`
                          : ""}
                        {step.learningGoal.progressPercent != null
                          ? ` · ${step.learningGoal.progressPercent}% of the target`
                          : ""}
                      </p>
                      {step.learningGoal.liveNote ? (
                        <p className="text-muted-foreground">{step.learningGoal.liveNote}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      The Goal number is not stored yet. Stay here. GroovGro
                      will not add spend.
                    </p>
                  )}
                </>
              ) : openPageLabel ? (
                <OpenPageNextStepButtons
                  href={step.primary.href}
                  label={openPageLabel}
                  canDecide={canDecide}
                />
              ) : step.primary.source === "review" &&
                step.primary.kind === "no_change_yet" ? (
                <div className="flex flex-wrap gap-2">
                  <SaveGrowthReviewButton
                    kind="weekly"
                    canSave={canDecide}
                    nothingYet
                  />
                </div>
              ) : dedicatedVisible ? null : hasDedicatedNextStepControls(step.primary.title) ? (
                <OpenPageNextStepButtons
                  href={step.primary.href}
                  label="Open Goals"
                  canDecide={canDecide}
                />
              ) : canDecide ? (
                <NextStepResponseButtons
                  kind={step.primary.kind}
                  href={step.primary.href}
                />
              ) : step.primary.href !== "/app/next-step" ? (
                <Button asChild variant="outline">
                  <Link href={step.primary.href}>Open the page</Link>
                </Button>
              ) : null}
              {canCreateGoal &&
              step.primary.title === GOAL_REACHED_STEP_TITLE &&
              step.primary.goalId ? (
                <DraftNextGoalButton goalId={step.primary.goalId} />
              ) : null}
              {canActivateGoal &&
              step.primary.title === ACTIVATE_GOAL_STEP_TITLE &&
              step.primary.goalId ? (
                <ActivateGoalButton goalId={step.primary.goalId} />
              ) : null}
              {canDraftPlan &&
              step.primary.title === DRAFT_PLAN_STEP_TITLE &&
              step.primary.goalId ? (
                <DraftGrowthPlanButton goalId={step.primary.goalId} />
              ) : null}
              {step.primary.title === APPROVE_PLAN_STEP_TITLE &&
              step.primary.planId ? (
                <GrowthPlanReviewButtons
                  planId={step.primary.planId}
                  canApprove={canApprovePlan}
                />
              ) : null}
              {canDraftPlan &&
              step.primary.title === PROPOSE_ACTIONS_STEP_TITLE &&
              step.primary.planId ? (
                <ProposePlanActionsButton planId={step.primary.planId} />
              ) : null}
            </CardContent>
          </Card>

          {step.waitingActions.length > 0 &&
          step.primary.title !== APPROVE_ACTIONS_STEP_TITLE ? (
            <Card>
              <CardHeader>
                <CardTitle>Waiting for your say</CardTitle>
                <CardDescription>
                  These are saved proposals. Approving them does not run them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {step.waitingActions.map((action) => (
                  <div key={action.id} className="space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{action.description}</p>
                    <p className="text-muted-foreground">
                      {action.status} · {labelFor(action.risk)}
                      {action.module ? ` · ${action.module}` : ""}
                    </p>
                    <WaitingActionButtons
                      actionId={action.id}
                      canApprove={canApprove}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>What GroovGro is leaving alone</CardTitle>
              <CardDescription>
                Ads, email, and social stay off. Thin evidence stays as wait.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {step.leftAlone.length === 0 ? (
                <p className="text-muted-foreground">
                  Nothing extra is being left alone this period.
                </p>
              ) : (
                step.leftAlone.map((item) => (
                  <div key={`${item.specialistId ?? item.title}`}>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground">{item.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Write it as a plan</CardTitle>
              <CardDescription>
                Next step is one thing to do now. Use the buttons above. A
                Growth Plan is a versioned write-up for a Goal. After you
                approve a plan, GroovGro can propose the first actions.
                Nothing runs until you say so, and even then GroovGro does
                not execute.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/app/goals">Open Goals</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/work">Open Your work</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/app">The path so far</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/goals">Goals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/growth-review">Growth review</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/intelligence">Specialists</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/decisions">Decisions</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
