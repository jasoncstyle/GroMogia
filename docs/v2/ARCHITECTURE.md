# V1 → V2 Architecture Change Report

First implementation slice: **V2 growth foundation**. This is not the Growth Director and not autonomous marketing.

V1 checkpoint tag: `pre-v2-architecture-checkpoint` (`7d4c9be`). Compare against that tag to see what V2 actually changed.

## KEEP

No rewrite of working V1:

- Organizations, users, memberships, RBAC, modules, feature flags
- Brand settings, Brand Voice, media, integrations
- Website connection, public lead form, tracking snippet
- Events, CRM, Stripe read-copy payments, attribution touches
- Intelligence observe + recommend
- SEO checks, drafts, Search Console read-only
- Optional website builder (rows, inner rows, chrome, Blob uploads)
- Audit log and notifications
- Coming-soon public homepage

Website builder stays optional. V2’s later “Phase 13 builder” does not mean delete Phase 7 work.

## ADJUST NOW (done in this slice)

### 1. First-class growth tables

**Reason:** V2 §69 says Goals, Offers, constraints, Decision History, Actions, and evidence windows are cheaper to introduce now than later.

**Affected:** `src/lib/db/schema.ts`, `drizzle/0018_v2_growth_foundation.sql`, `src/lib/db/ensure-schema.ts`

**Migration risk:** Additive tables and nullable columns. Existing rows keep working. Preview and production apply the migration on deploy.

**Current functionality:** Unchanged. New nav items appear when modules are enabled (they are on by default, like other foundation modules).

**Approach:** New tables only. No drop/rename of V1 tables.

### 2. Optional Goal / Plan / Offer links on marketing records

**Reason:** V2 wants marketing entities to support `goal_id` and `plan_id` without forcing them.

**Affected:** `lead_records`, `events`, `bookings`, `attribution_touches` — nullable columns.

**Migration risk:** Low. Columns are unused until later forms write them.

**Current functionality:** Event, lead, and Stripe flows do not require the new fields.

### 3. Permissions for goals, offers, plans, actions, and decisions

**Reason:** Action-level authorization must exist before any AI execution.

**Affected:** `src/lib/permissions.ts`, catalog bootstrap.

**Migration risk:** New permission rows inserted with `onConflictDoNothing`. Session still grants the owner role in code.

### 4. Independent modules for Business, Offers, and Goals

**Reason:** V2 remains modular. An organization can use Goals without the website builder.

**Affected:** `src/lib/modules/catalog.ts`, app shell icons.

### 5. Feature-flag Growth Director and automation off

**Reason:** V2 forbids unrestricted autonomy now.

**Affected:** `src/lib/db/bootstrap.ts` flags `growth_director` and `guarded_automation` default false. `v2_growth_foundation` default true.

### 6. Website page checklist before Review reads

**Reason:** Discover → ask → confirm. A full automatic crawl is unreliable (JavaScript calendars, third-party widgets, huge event HTML) and can treat homepage slogans as offers.

**Affected:** `website_discovered_pages` (`drizzle/0020_v2_website_page_checklist.sql`), Website and Business screens, `reviewConnectedBusiness`.

**Migration risk:** Additive table. Existing reviews still work: if no checklist exists yet, Review finds pages, stores them, and reads the suggested-important ones.

**Current functionality:** Saving a website address still does not read pages. Find pages lists what GroovGro can see. Review reads only checked pages. The live site is not changed. Drafts stay inactive until confirm.

### 7. Persist Goal progress from connected data

**Reason:** Live counts on read are not a history. Reviews and owners need a stored number they can compare later.

**Affected:** `growth_goals.progress_recorded_at`, `goal_progress_snapshots` (`drizzle/0021_v2_goal_progress.sql`), Goals screen, Review connected data.

**Migration risk:** Additive column and table. Existing goals keep working with no history until the owner saves progress or reviews connected data.

**Current functionality:** Computable goals write `currentValue` and one snapshot per day from connected leads, bookings, and payments. Manual Current updates write a hand-saved snapshot. GroovGro does not execute marketing.

### 8. Coordinated Next step

**Reason:** Specialists and reviews can list many ideas. The owner needs one next thing, or an explicit wait.

**Affected:** `src/lib/growth/next-step.ts`, Next step screen, specialist reports, Business drafts.

**Current functionality:** One coordinated recommendation from Goals, specialists, and drafts. Approve or reject saved proposals. Do not execute. Ads, email, and social stay left alone.

### 9. Versioned Growth Plan from a Goal

**Reason:** A Goal without a written plan is only a number. The owner needs a versioned strategy they can approve or reject before anything runs.

**Affected:** `src/lib/growth/plan-draft.ts`, `src/lib/actions/growth-plan.ts`, Goals screen. Uses existing `growth_plans`.

**Migration risk:** None. Reuses the existing plans table. New drafts increment `version`. Approving supersedes other approved/active plans for that Goal.

**Current functionality:** GroovGro drafts a plain-English plan from a confirmed Goal, Brand, confirmed offers, Next step, website connection, and open leads. The owner approves or rejects. Approving writes Decision History. GroovGro does not execute, start ads, send email, charge a card, or change the live website.

### 10. Proposed actions from an approved plan

**Reason:** An approved plan is still only a write-up. The owner needs the first concrete actions, still proposed, so later execution has something to approve.

**Affected:** `src/lib/growth/plan-actions.ts`, `src/lib/actions/growth-plan.ts`, Goals screen. Uses existing `growth_actions`.

**Migration risk:** None. Reuses the existing actions table. Dedupes waiting actions on the same Goal by `actionType`.

**Current functionality:** After a plan is approved, the owner can propose up to three first actions (follow up leads, connect the website, confirm offers, do the Next step, or wait). Approve or reject. GroovGro does not execute, start ads, send email, charge a card, or change the live website.

### 11. Owner work list

**Reason:** Approving an action is not the same as doing it. GroovGro must not execute. The owner needs a list of approved work they can do themselves and mark done.

**Affected:** `src/lib/growth/owner-work.ts`, `src/lib/actions/owner-work.ts`, Your work screen (`/app/work`), Dashboard, Goals. Uses existing `growth_actions.status` text values `completed_by_owner` and `skipped_by_owner`. Does not set `executedAt`.

**Migration risk:** None. Reuses the actions table. New module `growth_work` is enabled by default via `ensureOrganizationModules`.

**Current functionality:** Your work lists approved actions with Open the page, I did this, and Skip for now. GroovGro records the owner’s mark and writes Decision History. It does not execute, start ads, send email, charge a card, or change the live website.

### 12. What changed after owner work

**Reason:** Doing work is not the same as knowing whether the Goal moved. GroovGro should compare the number and say wait when evidence is thin. It must not change course on its own.

**Affected:** `src/lib/growth/work-learning.ts`, `src/lib/actions/owner-work.ts`, Your work, Dashboard, Decisions. Stores a Goal baseline in `growth_actions.result` when the owner marks work done. Writes `decision_records.outcome` when they check.

**Migration risk:** None. Reuses existing text columns. Does not set `executedAt`.

**Current functionality:** I did this stores today’s Goal number. Check what changed compares that number to now. Outcomes: too soon, improved, same, declined, target reached, or no Goal. GroovGro does not change the plan, start ads, send email, charge a card, or change the live website.

### 13. Next step uses Your work and what changed

**Reason:** Next step was coordinating specialists and drafts only. After the owner approves work and checks what changed, the next recommendation must use that, or GroovGro will keep suggesting the same disconnected follow-up.

**Affected:** `src/lib/growth/next-step.ts`, `getCoordinatedNextStep`, Next step screen.

**Migration risk:** None. Reads existing actions and decision outcomes.

**Current functionality:** Next step priority is (1) confirm drafts, (2) do approved work on Next step, (3) check what changed on Next step, (4) review a connected website that has not been read, (5) make a drafted next Goal active, (6) draft a plan for an active Goal that has none, (7) approve a draft plan for the active Goal, (8) propose first actions from an approved plan that has none, (9) approve or reject proposed actions, (10) use the latest what-changed outcome, (11) specialist recommend, (12) wait. Ads, email, and social stay left alone. GroovGro does not execute.

### 14. The path so far

**Reason:** Goal, plan, work, learning, and Next step were on separate screens. The owner needs one plain-English path.

**Affected:** `src/lib/growth/story.ts`, Dashboard, Decisions. Reads existing Goals, plans, actions, decision outcomes, and Next step.

**Migration risk:** None.

**Current functionality:** Dashboard and Decisions show The path so far. Work, what changed, and what should happen next open Next step, where the buttons are. GroovGro does not execute, start ads, send email, charge a card, or change the live website.

### 15. Draft the next Goal after one is reached

**Reason:** A reached Goal is the end of one loop. The owner needs a reviewable next Goal. GroovGro must not invent industry targets or activate marketing.

**Affected:** `src/lib/growth/next-goal.ts`, `src/lib/actions/next-goal.ts`, Goals, Next step. Reuses `growth_goals`. Dedupes with `inferredFrom = reached:{goalId}`.

**Migration risk:** None.

**Current functionality:** If a Goal is achieved or the live number meets the target, the owner can draft the next Goal. The new target is the current number plus the previous target size. It is saved as a draft. GroovGro does not execute.

### 16. Make a draft Goal active

**Reason:** After a next Goal is drafted, the owner still had to hunt a status dropdown. One button should make that draft the active Goal.

**Affected:** `src/lib/growth/next-goal.ts`, `src/lib/actions/next-goal.ts`, Goals, Next step. Reuses `growth_goals`. Does not auto-draft a plan.

**Migration risk:** None.

**Current functionality:** A reviewed draft Goal can be made active. Suggested website drafts stay on Business. If the draft came from a reached Goal, that older Goal is marked achieved. Other active Goals are paused. GroovGro does not execute.

### 17. Draft a plan from Next step

**Reason:** After a Goal is made active, the owner still had to open Goals to draft a plan. Next step should name that and put the button there. A reached-Goal note from the previous Goal should not keep showing.

**Affected:** `src/lib/growth/plan-draft.ts`, `src/lib/growth/next-step.ts`, Next step. Reuses `draftGrowthPlanForGoal`. Does not auto-approve or execute.

**Migration risk:** None.

**Current functionality:** If an active Goal has no draft or approved plan and has not reached its target, Next step asks the owner to draft a plan. The Draft a plan button is on Next step. Confirming Business drafts, Your work, and activating a next Goal still come first. GroovGro does not execute.

### 18. Approve a plan from Next step

**Reason:** After a plan is drafted, the owner still had to open Goals to approve it. Next step should name that and put approve/reject there. Approving must not execute.

**Affected:** `src/lib/growth/plan-draft.ts`, `src/lib/growth/next-step.ts`, Next step. Reuses `approveGrowthPlan` / `rejectGrowthPlan`. Does not propose actions or execute.

**Migration risk:** None.

**Current functionality:** If the active Goal has a draft plan, Next step asks the owner to approve or reject it. The same buttons are on Next step. Drafting a missing plan still comes first. GroovGro does not execute.

### 19. Propose first actions from Next step

**Reason:** After a plan is approved, the owner still had to open Goals to propose the first actions. Next step should name that and put the button there. Proposing must not execute.

**Affected:** `src/lib/growth/plan-actions.ts`, `src/lib/growth/next-step.ts`, Next step. Reuses `proposeActionsForApprovedPlan`. Does not approve or run the actions.

**Migration risk:** None.

**Current functionality:** If the active Goal has an approved plan with no actions yet, Next step asks the owner to propose the first actions. The same button is on Next step. Approving a draft plan still comes first. GroovGro does not execute.

### 20. Approve proposed actions from Next step

**Reason:** After actions are proposed, they sat in a second card while Next step named something else. The owner needs one main ask: approve or reject those actions. Approving must not execute.

**Affected:** `src/lib/growth/next-step.ts`, Next step. Reuses `approveGrowthAction` / `rejectGrowthAction`. Does not run the actions.

**Migration risk:** None.

**Current functionality:** If proposed actions are waiting, Next step asks the owner to approve or reject them in the main recommendation. The buttons are there. Proposing missing actions still comes first. GroovGro does not execute.

### 21. Do owner work from Next step

**Reason:** After actions are approved, the owner still had to open Your work to do them. Next step already names that work. Put Open the page, I did this, and Skip for now there. GroovGro must not execute.

**Affected:** `src/lib/growth/next-step.ts`, Next step. Reuses `markOwnerActionDone` / `skipOwnerAction`. Does not run the actions. Your work stays as the full list.

**Migration risk:** None.

**Current functionality:** If approved actions are ready, Next step lists them in the main recommendation with Open the page, I did this, and Skip for now. Confirming Business drafts still comes first. GroovGro does not execute.

### 22. Check what changed from Next step

**Reason:** After the owner marks work done, they still had to open Your work to compare the Goal number. Next step should name that and put Check what changed there. GroovGro must not change the plan or execute.

**Affected:** `src/lib/growth/next-step.ts`, Next step. Reuses `checkWhatChanged`. Does not change the plan. Your work stays as the full list.

**Migration risk:** None.

**Current functionality:** If finished work has no stored what-changed note yet, Next step asks the owner to check what changed in the main recommendation. Doing approved work still comes first. GroovGro does not execute.

### 23. Confirm Business drafts from Next step

**Reason:** Confirming drafts is the first Next step, but Confirm and Reject still lived only on Business. The owner needs those buttons in the main recommendation. Confirming must not start marketing.

**Affected:** `src/lib/growth/next-step.ts`, Next step. Reuses `confirmOffer` / `rejectOffer` / `confirmGoal` / `rejectGoal`. Does not activate marketing.

**Migration risk:** None.

**Current functionality:** If suggested offers or goals are waiting, Next step lists them with Confirm and Reject. Nothing becomes active until the owner confirms. GroovGro does not execute.

### 24. Connect the existing website from Next step

**Reason:** When Next step is connect the existing website, the owner still had to open Website to paste the address. Put Save website on Next step. GroovGro must not overwrite the live site.

**Affected:** Next step. Reuses `saveWebsiteConnection`. Does not crawl or replace the site.

**Migration risk:** None.

**Current functionality:** If Next step is connect the existing website, the owner can paste the live address and save it there. GroovGro does not change the live site.

### 25. Review the connected website from Next step

**Reason:** After a site address is saved, GroovGro still asked the owner to leave Next step to read pages. Put Review connected data on Next step when the site has not been read.

**Affected:** `src/lib/growth/next-step.ts`, Next step. Reuses `reviewConnectedBusiness`. Does not change the live site.

**Migration risk:** None.

**Current functionality:** If a website is saved but unread, Next step asks the owner to review it there. GroovGro does not change the live site.

### 26. Follow up open leads from Next step

**Reason:** I’ll do this created a second proposed action for work that is already “open Leads & customers.” Put that open button on Next step and do not create a duplicate action.

**Affected:** Next step. Reuses the CRM page. Does not email leads.

**Migration risk:** None.

**Current functionality:** If Next step is follow up open leads, the owner opens Leads & customers from that page. GroovGro does not email anyone.

### 27. Save this week’s growth review from Next step

**Reason:** When the coordinated next step is wait from the weekly review, the owner still had to open Growth review to save it. Put that save on Next step.

**Affected:** Next step. Reuses `saveGrowthReview`. Does not execute marketing.

**Migration risk:** None.

**Current functionality:** If Next step is wait from the review, the owner can save this week’s review to Decision History there. After Check what changed, a wait still uses Save nothing yet. GroovGro does not execute.

### 28. Run an SEO check from Next step

**Reason:** When no SEO check has been saved, Next step already names that work. Put Run homepage check there so the owner does not have to open SEO first. GroovGro must not edit the website.

**Affected:** Next step. Reuses `runSeoAudit`. Does not change the connected website.

**Migration risk:** None.

**Current functionality:** If Next step is run an SEO check, the owner can run the homepage check there. GroovGro does not edit the live site.

### 29. Open SEO or Events from Next step

**Reason:** I’ll do this created a second proposed action for specialist work that is already “open this page.” Put Open SEO or Open Events on Next step instead.

**Affected:** Next step. Reuses the SEO and Events pages. Does not edit the live website or change ads.

**Migration risk:** None.

**Current functionality:** If Next step is review the schedule, the owner opens Events from Next step. GroovGro does not execute.

### 30. Keep one button on Next step

**Reason:** Draft the next Goal, make it active, draft or approve a plan, and propose actions already had their real buttons on Next step, plus I’ll do this. That created a second proposed action. Hide I’ll do this when the real button is there. Goal follow-up from what changed opens Goals.

**Affected:** Next step. Reuses existing Goal and plan buttons. Does not execute.

**Migration risk:** None.

**Current functionality:** If Next step already has Draft the next Goal, Make this the active Goal, Draft a plan, Approve this plan, or Propose the first actions, those are the only buttons. If the signed-in person cannot use that button, Next step shows Open Goals instead of I’ll do this. If what changed says to read or add a Goal, Open Goals is the main button. GroovGro does not execute.

### 31. Draft and approve SEO copy from Next step

**Reason:** When Next step is fix blocking SEO items or improve the page, Draft improvements and Approve still lived only on SEO. Put those buttons on Next step. Approving must not edit the live connected website.

**Affected:** Next step. Reuses `createSeoDrafts` / `decideSeoDraft`. Does not apply drafts to the paused builder from this page. Does not change the connected website.

**Migration risk:** None.

**Current functionality:** If Next step is fix blocking SEO items or improve the page, the owner can draft, copy, approve, or reject homepage SEO copy there. GroovGro does not paste that copy onto the live site.

### 32. Connect Search Console from Next step

**Reason:** After a homepage check, Search Console still lived only on SEO. Put Connect Search Console on Next step when it is not connected. GroovGro must stay read-only.

**Affected:** Next step. Reuses `/api/google/start`. Does not edit the website, submit a sitemap, or buy ads.

**Migration risk:** None.

**Current functionality:** If a homepage check is saved, blocking items are clear, and Search Console is not connected, Next step asks the owner to connect it there. GroovGro only reads search numbers.

### 33. Paste the tracking snippet from Next step

**Reason:** After a website is connected, the owner still had to open Website to copy the tracking snippet. Put Copy snippet on Next step when no visits are recorded yet. GroovGro must not replace the live site.

**Affected:** Next step. Reuses `TrackingSnippet`. Does not change the connected website.

**Migration risk:** None.

**Current functionality:** If a website is connected and GroovGro has not recorded visits yet, Next step shows the tracking snippet to copy. Open leads still come first. GroovGro does not replace the live site.

### 34. Review the schedule from Next step

**Reason:** When Next step is review the schedule, Add event still lived only on Events. Put the upcoming list and Save event on Next step. GroovGro must not change ads or the website.

**Affected:** Next step. Reuses `createEvent`. Does not change ads or the live website.

**Migration risk:** None.

**Current functionality:** If Next step is review the schedule, the owner can see upcoming items and add a calendar item there. GroovGro does not change ads or the website.

### 35. Follow up open leads from Next step

**Reason:** Following up open leads still sent the owner to Leads & customers to move a person. Put Move and Mark customer on Next step. GroovGro must not email anyone.

**Affected:** Next step. Reuses `moveLead` / `convertLeadToCustomer`. Does not send email.

**Migration risk:** None.

**Current functionality:** If Next step is follow up open leads, the owner can move a person or mark them as a customer there, and copy the public lead form. GroovGro does not email anyone.

### 36. Choose the Search Console property from Next step

**Reason:** After Connect Search Console, Google sign-in still landed on SEO to pick the property. Put the property list on Next step and send Google back there. GroovGro must stay read-only.

**Affected:** Next step, Google start/callback. Reuses `selectSearchConsoleProperty`. Does not edit the website, submit a sitemap, or buy ads.

**Migration risk:** None.

**Current functionality:** If Google is connected but no property is saved, Next step asks the owner to choose it there. After Google sign-in, GroovGro returns to Next step. Open leads still come first. GroovGro only reads search numbers.

### 37. Refresh Search Console from Next step

**Reason:** After a Search Console property is saved, Refresh still lived only on SEO. Put Refresh on Next step when no numbers have been stored yet. GroovGro must stay read-only.

**Affected:** Next step. Reuses `syncSearchConsole`. Does not edit the website, submit a sitemap, or buy ads.

**Migration risk:** None.

**Current functionality:** If Search Console is connected and a property is saved, but GroovGro has no stored numbers yet, Next step asks the owner to refresh there. Open leads still come first. GroovGro only reads search numbers.

### 38. Add a Goal from Next step

**Reason:** When Check what changed found work that was not tied to a Goal, Next step only opened Goals. Put Save goal on Next step. GroovGro must not start marketing.

**Affected:** Next step. Reuses `createGoal`. Does not execute, send email, or buy ads.

**Migration risk:** None.

**Current functionality:** If Next step is add a Goal so GroovGro can compare a number, the owner can save a Goal there. GroovGro does not start marketing.

### 39. Read the Goal from Next step

**Reason:** When Check what changed found the Goal number is lower, Next step only opened Goals. Put the current number on Next step so the owner can read it there. GroovGro must not add spend.

**Affected:** Next step. Reads the Goal number. Does not change the plan, start ads, or edit the website.

**Migration risk:** None.

**Current functionality:** If Next step is read the Goal before changing course, the owner can see the current number there. GroovGro does not add spend.

### 40. Share the public lead form from Next step

**Reason:** When no person has been captured yet, the public lead form still lived only on Leads & customers. Put Copy link on Next step. GroovGro must not email anyone.

**Affected:** Next step. Reuses `CopyLink`. Does not send email.

**Migration risk:** None.

**Current functionality:** If the website is connected and GroovGro has not captured a person yet, Next step asks the owner to copy the public lead form. Open leads and the tracking snippet still come first. GroovGro does not email anyone.

### 41. Save brand voice from Next step

**Reason:** How the business sounds still lived only on Brand voice. Put Save voice on Next step when visits are recorded and no profile exists yet. GroovGro must not send email, post, or edit the live website.

**Affected:** Next step. Reuses `BrandVoiceProfileForm`. Does not publish.

**Migration risk:** None.

**Current functionality:** If the website is connected, visits are recorded, and no brand voice is saved, Next step asks the owner to save how the business sounds. Open leads, the tracking snippet, and the public lead form still come first. GroovGro does not send email, post to social, or edit the live website.

### 42. Add a brand voice example from Next step

**Reason:** After the voice profile is saved, a “more like this” example still lived only on Brand voice. Put Save example on Next step. GroovGro must not send email, post, or edit the live website.

**Affected:** Next step. Reuses `BrandVoiceExampleForm`. Does not publish.

**Migration risk:** None.

**Current functionality:** If visits are recorded, a brand voice profile is saved, and no example exists yet, Next step asks the owner to paste writing they already like. Saving the profile, open leads, the tracking snippet, and the public lead form still come first. GroovGro does not send email, post to social, or edit the live website.

### 43. Refresh stale Search Console numbers from Next step

**Reason:** Next step already asks to refresh when no Search Console numbers are stored. If the stored numbers are more than a week old, ask again. GroovGro must not edit the live website.

**Affected:** Next step. Reuses `SearchConsolePanel`. Read-only.

**Migration risk:** None.

**Current functionality:** If Search Console is connected, a property is saved, and the stored numbers are more than a week old, Next step asks the owner to refresh. Open leads still come first. GroovGro does not edit the website, submit a sitemap, or buy ads.

### 44. Draft copy in your voice from Next step

**Reason:** After the voice profile and an example are saved, creating a draft still lived only on Brand voice. Put Create draft on Next step. GroovGro must not send, post, or edit the live website.

**Affected:** Next step. Reuses `BrandVoiceDraftForm`. Does not publish.

**Migration risk:** None.

**Current functionality:** If visits are recorded, a brand voice profile and an example are saved, and no draft exists yet, Next step asks the owner to create a draft. Saving the profile, adding an example, open leads, the tracking snippet, and the public lead form still come first. GroovGro keeps the draft in this workspace. It does not send email, post to social, or edit the live website.

### 45. Add an offer from Next step

**Reason:** When no confirmed offer exists, adding one still lived only on Offers. Put Save offer on Next step. GroovGro must not start marketing.

**Affected:** Next step. Reuses `OfferCreateForm`. Does not execute.

**Migration risk:** None.

**Current functionality:** If visits are recorded and no confirmed offer exists, Next step asks the owner to name something the business promotes or wants a customer to do. Open leads, the tracking snippet, the public lead form, saving the brand, and saving how the business works still come first. GroovGro does not start marketing.

### 46. Save the brand from Next step

**Reason:** Name, what the business does, and who it serves still lived only on Brand. Put Save brand on Next step. GroovGro must not start marketing.

**Affected:** Next step. Reuses `BrandSettingsForm`. Does not execute.

**Migration risk:** None.

**Current functionality:** If visits are recorded and the brand is missing what the business does or who it serves, Next step asks the owner to save those. Open leads, the tracking snippet, and the public lead form still come first. GroovGro does not start marketing, send email, or edit the live website.

### 47. Save how the business works from Next step

**Reason:** Industry and how the business creates value still lived only on Business. Put Save business on Next step. GroovGro must not start marketing.

**Affected:** Next step. Reuses `BusinessBrainForm`. Does not execute.

**Migration risk:** None.

**Current functionality:** If visits are recorded, the brand is saved, and how the business works is still empty, Next step asks the owner to save the kind of business and how it creates value. Open leads, the tracking snippet, the public lead form, and saving the brand still come first. GroovGro does not start marketing, send email, or edit the live website.

### 48. Add a person from Next step

**Reason:** When no person has been captured yet, Next step already copies the public form. Adding someone the owner already knows still lived only on Leads. Put Save as new lead on that same Next step. GroovGro must not email anyone.

**Affected:** Next step. Reuses `LeadCreateForm`. Does not email.

**Migration risk:** None.

**Current functionality:** If the website is connected and GroovGro has not captured a person yet, Next step asks the owner to copy the public form or add someone they already know. Open leads and the tracking snippet still come first. GroovGro does not email anyone.

### 49. Find pages from Next step

**Reason:** When a website is saved but unread, Next step already had Review connected data, but Find pages still sent the owner to Website. Put Find pages and the page checklist on Next step. GroovGro must not change the live site.

**Affected:** Next step. Reuses `WebsitePageChecklist`. Does not edit the live site.

**Migration risk:** None.

**Current functionality:** If the website address is saved and pages have not been read yet, Next step asks the owner to find pages, check the important ones, then review. GroovGro does not change the live site.

### 50. Save today's Goal number from Next step

**Reason:** Saving today's Goal number from connected data still lived only on Goals. Put Save progress on Next step when a connected Goal has no history yet. GroovGro must not start marketing.

**Affected:** Next step. Reuses `SaveConnectedProgressButton`. Does not execute.

**Migration risk:** None.

**Current functionality:** If visits are recorded and an active connected Goal has never stored today's number, Next step asks the owner to save it. Open leads, the tracking snippet, and the public lead form still come first. GroovGro does not start marketing.

### 51. Connect payments from Next step

**Reason:** Marking the workspace as connected so GroovGro can read a copy of payments still lived only on Bookings & payments. The Dashboard already asked for it. Put Connect and Sync on Next step. GroovGro must not charge a card or change checkout.

**Affected:** Next step. Reuses `StripeReadCopyPanel`. Does not charge. Does not change checkout.

**Migration risk:** None.

**Current functionality:** If Stripe keys are on the deployment and this workspace is not marked connected, Next step asks the owner to connect so GroovGro can read a copy of payments. If it is connected but has never synced, Next step asks the owner to copy recent payment records. Open leads, the tracking snippet, and the public lead form still come first. GroovGro does not charge a card, create a Stripe account, or change checkout on the connected website.

### 52. Choose when you look at growth from Next step

**Reason:** The day and time for reading this week's numbers still lived only on Goals. Put Save schedule on Next step when that time has never been confirmed. GroovGro must not change the business then.

**Affected:** Next step. Reuses `GrowthSettingsForm`. Does not execute.

**Migration risk:** None.

**Current functionality:** If visits are recorded, the website basics are saved, and the growth review schedule has never been saved, Next step asks the owner to choose the day and time they look at this week's numbers. Open leads, the tracking snippet, the public lead form, and connecting payments still come first. GroovGro does not change the business then.

### 53. Dashboard sends the owner to Next step

**Reason:** The home screen still had a filled Connect website button and copy that sent the owner to Business or Bookings & payments. Next step already has those owner buttons. The home screen should name Next step.

**Affected:** Dashboard.

**Migration risk:** None.

**Current functionality:** Next step is the filled button on the home screen. Connect website is outline. If drafts are waiting, Stripe is not connected, or open leads need a follow-up, the home screen says to open Next step. GroovGro does not start marketing.

### 54. Owner work, specialists, and Intelligence send the owner to Next step

**Reason:** Approved work, specialist recommendations, proposed-action copy, and Intelligence still named module pages (Leads, Website, SEO, Bookings). Those owner buttons already live on Next step. Leave-alone still names the module page. Matching charges to people still names Bookings.

**Affected:** Owner work hrefs, specialist recommend hrefs, proposed-action copy, growth story, Intelligence recommendations.

**Migration risk:** None.

**Current functionality:** Follow up leads, connect website, confirm offers, watch progress, SEO, Search Console, tracking snippet, brand, business, offers, brand voice, growth schedule, payments, and calendar review recommend Next step. Ads, email, and social stay left alone. GroovGro does not execute.

### 55. Next step does not also send the owner to the module page (this slice)

**Reason:** Next step already has the owner buttons. Extra Open Website, Open SEO, and Open Leads buttons still sent the owner away. Your work should name Next step. Matching charges to people still names Bookings.

**Affected:** Next step, Your work, website-connect success copy.

**Migration risk:** None.

**Current functionality:** When the work is already on Next step, there is no second Open Website, Open SEO, Open Leads, Open Events, or Open Bookings button. Your work says Open Next step. Goal and plan fallbacks still name Goals when the main button is not available. GroovGro does not execute.

## BUILD NEXT (after this slice is tested)

- **Website builder is parked.** Optional GroovGro-hosted pages stay. Do not add builder features until Jason asks.
- **Growth Plan is parked.** Versioned write-up from a Goal. Approve or reject. Do not execute.
- **Plan actions are parked.** Propose first actions from an approved plan. Approve or reject. Do not execute.
- **Owner work is parked.** The owner does approved actions and marks them. GroovGro does not execute.
- **What changed is parked.** Compare the Goal number after owner work. Do not execute.
- **Next step learning is parked.** Coordinate drafts, Your work, and what changed. Do not execute.
- **Growth story is parked.** One path so far. Do not execute.
- **Next Goal is parked.** Draft the next Goal after one is reached. Do not execute.
- **Activate Goal is parked.** Make a reviewed draft the active Goal. Do not execute.
- **Draft a plan from Next step is parked.** Ask the owner to draft a plan for the active Goal. Do not execute.
- **Approve a plan from Next step is parked.** Ask the owner to approve or reject the draft plan. Do not execute.
- **Propose first actions from Next step is parked.** Ask the owner to propose the first actions from an approved plan. Do not execute.
- **Approve proposed actions from Next step is parked.** Ask the owner to approve or reject proposed actions. Do not execute.
- **Do owner work from Next step is parked.** Ask the owner to do approved work on Next step. Do not execute.
- **Check what changed from Next step is parked.** Ask the owner to compare the Goal number after work. Do not execute.
- **Confirm Business drafts from Next step is parked.** Ask the owner to confirm or reject suggested offers and goals. Do not execute. Do not start ads.
- **Save this week’s growth review from Next step is parked.** Ask the owner to save the weekly wait to Decision History. Do not execute.
- **Run an SEO check from Next step is parked.** Ask the owner to run the homepage check. Do not edit the live site.
- **Open SEO or Events from Next step is parked.** Ask the owner to open the named page. Do not execute.
- **Keep one button on Next step is parked.** Do not show I’ll do this next to the real button. Do not execute.
- **Draft and approve SEO copy from Next step is parked.** Ask the owner to draft and approve homepage SEO copy. Do not edit the live site.
- **Connect Search Console from Next step is parked.** Ask the owner to connect Search Console read-only. Do not edit the live site.
- **Paste the tracking snippet from Next step is parked.** Ask the owner to copy the snippet. Do not replace the live site.
- **Review the schedule from Next step is parked.** Ask the owner to add a calendar item. Do not change ads or the website.
- **Follow up open leads from Next step is parked.** Ask the owner to move a person or mark them as a customer. Do not email anyone.
- **Choose the Search Console property from Next step is parked.** Ask the owner to pick the property after Google sign-in. Do not edit the live site.
- **Refresh Search Console from Next step is parked.** Ask the owner to refresh Search Console numbers. Do not edit the live site.
- **Add a Goal from Next step is parked.** Ask the owner to save a Goal when work was not tied to one. Do not start marketing.
- **Read the Goal from Next step is parked.** Ask the owner to read the Goal number when it is lower. Do not add spend.
- **Share the public lead form from Next step is parked.** Ask the owner to copy the public form when no person has been captured yet. Do not email anyone.
- **Save brand voice from Next step is parked.** Ask the owner to save how the business sounds when visits are recorded and no profile exists yet. Do not send email, post, or edit the live website.
- **Add a brand voice example from Next step is parked.** Ask the owner to paste writing they already like after the profile is saved. Do not send email, post, or edit the live website.
- **Refresh stale Search Console numbers from Next step is parked.** Ask the owner to refresh when stored numbers are more than a week old. Do not edit the live site.
- **Draft copy in your voice from Next step is parked.** Ask the owner to create a draft after the profile and an example are saved. Do not send email, post, or edit the live website.
- **Add an offer from Next step is parked.** Ask the owner to name what the business promotes when no confirmed offer exists. Do not start marketing.
- **Save the brand from Next step is parked.** Ask the owner to save the business name, what it does, and who it serves when that is still empty. Do not start marketing.
- **Save how the business works from Next step is parked.** Ask the owner to save the kind of business and how it creates value when that is still empty. Do not start marketing.
- **Add a person from Next step is parked.** Ask the owner to copy the public form or add someone they already know when no person has been captured yet. Do not email anyone.
- **Find pages from Next step is parked.** Ask the owner to find pages, check the important ones, and review when the website is saved but unread. Do not change the live site.
- **Save today's Goal number from Next step is parked.** Ask the owner to save today's Goal number when a connected Goal has no history yet. Do not start marketing.
- **Connect payments from Next step is parked.** Ask the owner to connect so GroovGro can read a copy of payments, or sync recent payment records when the workspace is connected but has never synced. Do not charge a card or change checkout.
- **Choose when you look at growth from Next step is parked.** Ask the owner to save the day and time they look at this week's numbers when that schedule has never been saved. Do not change the business then.
- **Dashboard sends the owner to Next step is parked.** Next step is the filled home-screen button. Drafts, Stripe, and open leads say to open Next step. Do not start marketing.
- **Owner work, specialists, and Intelligence send the owner to Next step is parked.** Recommend Next step for owner loops that already have buttons there. Leave-alone still names the module page. Do not execute.
- **Next step does not also send the owner to the module page (this slice).** Do not show a second Open Website or Open SEO button. Your work names Next step. Do not execute.

## DESIGN FOR LATER

- Guarded execution of Actions
- Google Ads / Meta / email / social / reviews
- Capability registry as a formal runtime
- Internal business event bus
- Statistical confidence engine (keep simple thresholds until volume exists)
- Custom domains for builder sites
- Commercial billing

## Current design risks that would have hurt later

| Risk if we had waited | Why it mattered | What we did |
| --- | --- | --- |
| Brand settings as the only “brain” | Brand is presentation; Brain is understanding | New dedicated `business_brains` table; Brand stays |
| Event `capacity` as the only availability | Industry-shaped, only for calendar items | Generalized `availability_constraints` |
| `ai_action_logs` as the Action model | Logs are not approvable work items | New `growth_actions` (proposed only) |
| Intelligence page as the only “what next” | Not goal-linked, easy to become vanity insights | Goals and Decision History are first-class |
| One universal waiting period | SEO vs email vs ads learn at different speeds | `evidence_policies` per channel |

## Industry-specific check

Searched V1 and the new growth schema for seat, boat, student, ticket, sailing as core fields. None added. Events remain a generic calendar. Commerce remains bookings and payments. Test businesses must not dictate generic architecture.

## Integration architecture

Unchanged: provider adapters, capability lists on `integration_providers`, Stripe read-copy only. Growth Director must never assume an unavailable capability. No new providers in this slice.

## AI / authorization boundary

Unchanged rule: AI goes through application services. New Actions cannot execute. Autonomy stored on `growth_settings` and capped at Recommend (level 2) in the save path.

## Cadence representation

`growth_settings` stores review frequency, day, time, and timezone. Evidence policies store waiting thresholds. Weekly and monthly reviews are generated on read from connected data. Saving a review writes Decision History. There is no daily job and no auto-change. Monitoring, analysis, decision, execution, and user review remain separate concepts.

## Evidence windows without a stats engine

A policy is: minimum elapsed days, observations, and conversions. Helper `evidenceRecommendation()` returns `no_change_yet` or `change_allowed`. That is enough until real volume exists.

## What V2 still lacks (important, not in this slice)

- Attribution from campaign all the way to a Goal
- Specialist execute path
- Risk guardrail engine beyond stored fields and permissions

## What in V2 is unnecessarily complex for now

- Sixteen overlapping roadmap phases (V1 already built the builder)
- Formal specialist plugin interface
- Full statistical significance engine
- Internal event bus / microservices
- Autonomy levels 5–6
- AI employee personas

## Updated domain model

```
Organization
  ├─ Brand settings (name, description, audience)
  ├─ Business Brain (industry, model, locations, hours, discovery)
  ├─ Growth settings (autonomy, review schedule)
  ├─ Evidence policies (per channel)
  ├─ Website
  │    └─ Discovered pages (checklist of what Review may read)
  ├─ Offers
  │    └─ Availability constraints (optional)
  ├─ Growth Goals (optional Offer)
  │    ├─ Progress snapshots (one stored number per day)
  │    ├─ Growth Plans (versioned)
  │    ├─ Decision records
  │    └─ Growth Actions (proposed only)
  └─ V1 records (leads, events, bookings, touches) with optional goal/offer ids
```

## Updated phased roadmap (practical)

1. **Foundation entities and UI.** Done.
2. **Connect live progress** — goals read leads, customers, payments. Done. Stored snapshots added in this slice.
3. **Reviews** — weekly / monthly summaries, including no-change. Done in this slice.
4. **Intelligence on goals** — specialists read, analyze, and recommend, including no-change. Done in this slice.
5. **Specialist work with Goal linkage** — SEO and other connected modules recommend; email and ads stay disconnected. Done for recommend-only.
6. **Growth Director** — coordinate as Next step, still approval-first. Done for recommend-only.
7. **Growth Plan** — versioned draft from a Goal; owner approves or rejects. Done for draft/approve.
8. **Actions from an approved plan** — proposed only. Done for propose/approve.
9. **Owner work** — owner does approved actions and marks them. Done for I did this / Skip.
10. **What changed** — compare the Goal number after owner work. Done for check/compare.
11. **Next step uses learning** — drafts, Your work, then what changed. Done.
12. **Growth story** — one path so far on Dashboard and Decisions. Done.
13. **Next Goal** — draft the next Goal after one is reached. Done.
14. **Activate Goal** — make a reviewed draft the active Goal. Done.
15. **Draft a plan from Next step** — ask the owner to draft a plan for the active Goal. Done.
16. **Approve a plan from Next step** — ask the owner to approve or reject the draft plan. Done.
17. **Propose first actions from Next step** — ask the owner to propose the first actions. Done.
18. **Approve proposed actions from Next step** — ask the owner to approve or reject proposed actions. Done.
19. **Do owner work from Next step** — ask the owner to do approved work on Next step. Done.
20. **Check what changed from Next step** — ask the owner to compare the Goal number after work. Done.
21. **Confirm Business drafts from Next step** — ask the owner to confirm or reject suggested offers and goals. Done.
22. **Connect, review, follow up, and save wait from Next step** — keep those owner buttons on Next step. Done.
23. **Run an SEO check from Next step** — run the homepage check on Next step. Done.
24. **Open SEO or Events from Next step** — open the named page instead of I’ll do this. Done.
25. **Keep one button on Next step** — do not show I’ll do this next to the real button. Done.
26. **Draft and approve SEO copy from Next step** — draft and approve homepage SEO copy on Next step. Done.
27. **Connect Search Console from Next step** — connect Search Console read-only from Next step. Done.
28. **Paste the tracking snippet from Next step** — copy the snippet on Next step when visits are not recorded yet. Done.
29. **Review the schedule from Next step** — add a calendar item on Next step. Done.
30. **Follow up open leads from Next step** — move a person or mark them as a customer on Next step. Done.
31. **Choose the Search Console property from Next step** — pick the property after Google sign-in on Next step. Done.
32. **Refresh Search Console from Next step** — refresh Search Console numbers on Next step when none are stored yet. Done.
33. **Add a Goal from Next step** — save a Goal on Next step when work was not tied to one. Done.
34. **Read the Goal from Next step** — read the Goal number on Next step when it is lower. Done.
35. **Share the public lead form from Next step** — copy the public form on Next step when no person has been captured yet. Done.
36. **Save brand voice from Next step** — save how the business sounds on Next step when visits are recorded and no profile exists yet. Done.
37. **Add a brand voice example from Next step** — paste writing the owner already likes on Next step after the profile is saved. Done.
38. **Refresh stale Search Console numbers from Next step** — refresh Search Console numbers on Next step when they are more than a week old. Done.
39. **Draft copy in your voice from Next step** — create a draft on Next step after the profile and an example are saved. Done.
40. **Add an offer from Next step** — save an offer on Next step when none are confirmed yet. Done.
41. **Save the brand from Next step** — save name, what the business does, and who it serves on Next step when that is still empty. Done.
42. **Save how the business works from Next step** — save the kind of business and how it creates value on Next step when that is still empty. Done.
43. **Add a person from Next step** — copy the public form or add someone the owner already knows on Next step when no person has been captured yet. Done.
44. **Find pages from Next step** — find pages, check the important ones, and review on Next step when the website is saved but unread. Done.
45. **Save today's Goal number from Next step** — save today's Goal number on Next step when a connected Goal has no history yet. Done.
46. **Connect payments from Next step** — connect so GroovGro can read a copy of payments, or sync recent payment records, on Next step. Done. GroovGro does not charge a card or change checkout.
47. **Choose when you look at growth from Next step** — save the day and time to read this week's numbers on Next step when that schedule has never been saved. Done. GroovGro does not change the business then.
48. **Dashboard sends the owner to Next step** — Next step is the filled home-screen button; drafts, Stripe, and open leads say to open Next step. Done.
49. **Owner work, specialists, and Intelligence send the owner to Next step** — recommend Next step for owner loops that already have buttons there. Done.
50. **Next step does not also send the owner to the module page** — no second Open Website or Open SEO button when the work is already here. This slice.
51. **Guarded automation** — only after the above is trusted.

V1 website builder, SEO, Brand Voice, and Stripe stay available throughout.
