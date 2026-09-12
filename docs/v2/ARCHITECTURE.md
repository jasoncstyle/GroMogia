# V1 → V2 Architecture Change Report

First implementation slice: **V2 growth foundation**. This is not the Growth Director and not autonomous marketing.

GroovGro is a business partner. The owner runs day-to-day operations. GroovGro runs the marketing side and makes suggestions. The owner decides what gets implemented. Some suggestions the owner does. Some suggestions the owner authorizes GroovGro to do.

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

**Current functionality:** If Next step already has Draft the next Goal, Make this the active Goal, Draft a plan, Approve this plan, or Propose the first actions, those are the only buttons. If the signed-in person cannot use that button, Next step shows Leave this alone, not Open Goals. If what changed says to read or add a Goal, those buttons stay on Next step. GroovGro does not execute.

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

### 55. Next step does not also send the owner to the module page

**Reason:** Next step already has the owner buttons. Extra Open Website, Open SEO, and Open Leads buttons still sent the owner away. Your work should name Next step. Matching charges to people still names Bookings.

**Affected:** Next step, Your work, website-connect success copy.

**Migration risk:** None.

**Current functionality:** When the work is already on Next step, there is no second Open Website, Open SEO, Open Leads, Open Events, or Open Bookings button. Your work says Open Next step. Goal and plan fallbacks still name Goals when the main button is not available. GroovGro does not execute.

### 56. The path so far, specialists, and Intelligence name Next step

**Reason:** The path so far still opened Goals for a missing Goal or plan, and Your work when nothing was ready. Specialists and Intelligence said Open related page even when the href was Next step.

**Affected:** Growth story, Dashboard and Decisions path cards, specialist cards, Intelligence recommendations.

**Migration risk:** None.

**Current functionality:** If there is no Goal yet, The Goal opens Next step. If there is no approved plan yet, The plan opens Next step. The work always opens Next step. When a Goal or approved plan already exists, those cards still open Goals so the owner can read them. Specialists and Intelligence say Open Next step when that is the related page. Leave-alone still names the module page. GroovGro does not execute.

### 57. Growth review can change the schedule here

**Reason:** Growth review still sent the owner to Goals to change the day and time they look at this week's numbers. The schedule form already exists. Put it on Growth review.

**Affected:** Growth review.

**Migration risk:** None.

**Current functionality:** Growth review has Save schedule on that page. It does not send the owner to Goals to change the day and time. GroovGro does not change the business then. Next step still asks to choose the schedule when it has never been saved.

### 58. Your work filled button is Next step

**Reason:** Your work still had a filled Open the approved plan or Draft or approve a plan button that sent the owner to Goals. Draft, approve, propose, and do the work already live on Next step. Reading an approved plan can stay on Goals as outline.

**Affected:** Your work.

**Migration risk:** None.

**Current functionality:** Your work’s filled button is Open Next step. If an approved plan exists, Open the approved plan is outline so the owner can read it on Goals. GroovGro does not execute.

### 59. What changed and next-Goal copy name Next step

**Reason:** After a Goal was reached, what changed still said Open Goals. Drafting the next Goal twice still said Open Goals. SEO still sent Connect website to Website. Those owner buttons already live on Next step.

**Affected:** Work learning copy, next-Goal toast, SEO connect button.

**Migration risk:** None.

**Current functionality:** If a Goal reached its target, what changed says to read the history on Next step. If a next Goal was already drafted, the toast says Open Next step. If SEO has no connected website, Connect website opens Next step. GroovGro does not start marketing.

### 60. Dashboard Connect website opens Next step

**Reason:** The home screen still had an outline Connect website button that opened Website. The website address form already lives on Next step.

**Affected:** Dashboard.

**Migration risk:** None.

**Current functionality:** Connect website on the home screen opens Next step. Next step stays the filled button. GroovGro does not move the live site.

### 61. Owner module pages offer Next step

**Reason:** Website, Leads, Bookings, SEO, Brand voice, Business, Events, and Offers had no way back to Next step if the owner landed there.

**Affected:** Those owner pages.

**Migration risk:** None.

**Current functionality:** Those pages have an outline Open Next step button. GroovGro does not execute.

### 62. Remaining owner pages offer Next step

**Reason:** Growth review, Intelligence, Decisions, Settings, Brand, Team, Media, Integrations, Marketing, Analytics, Notifications, and Audit still had no way back to Next step if the owner landed there. Dashboard, Your work, Goals, and Next step already name Next step. The website builder stays paused.

**Affected:** Those remaining owner pages.

**Migration risk:** None.

**Current functionality:** Those pages have an outline Open Next step button. GroovGro does not execute. The website builder is unchanged.

### 63. Confirm drafts, review site, owner work, and wait stay on Next step

**Reason:** The coordinator still named Business, Website, Your work, or Growth review for loops whose buttons already live on Next step. Intelligence website and Stripe connect observations still opened those module pages.

**Affected:** Next step coordinator, Intelligence observations, Goals label.

**Migration risk:** None.

**Current functionality:** Confirm drafts, review the unread site, do approved work, check what changed, and save a wait all name Next step. Intelligence website and Stripe connect observations open Next step. Matching charges still names Bookings. Goal and plan work still names Goals. GroovGro does not execute.

### 64. Your work Open the page stays on Next step

**Reason:** Approved specialist, SEO, website, and brand-voice work still sent Your work’s Open the page button to those module pages. Saving I’ll do this still said to open the linked page.

**Affected:** Your work links, Next step save copy.

**Migration risk:** None.

**Current functionality:** Your work Open the page opens Next step for those owner loops. Saving I’ll do this no longer names a different page. Matching charges still names Bookings. Leave-alone still names the module page. GroovGro does not execute.

### 65. Next step is first after Dashboard in the nav

**Reason:** Next step sat in the Grow group after Offers, Website, Leads, and Bookings. The owner had to hunt for the one page that already holds the owner-assistance buttons.

**Affected:** Signed-in nav.

**Migration risk:** None.

**Current functionality:** Next step is the first signed-in nav item after Dashboard. Offers, Website, Leads, and Bookings stay below it. GroovGro does not execute.

### 66. Intelligence people observations open Next step when that is the loop

**Reason:** Intelligence still sent People in the workspace to Leads even when follow-up or adding a person already lives on Next step.

**Affected:** Intelligence observations.

**Migration risk:** None.

**Current functionality:** If there are open leads, or no person has been captured yet, People in the workspace opens Next step. If people are already in the workspace and none are open leads, it still opens Leads. Matching charges still names Bookings. GroovGro does not email anyone.

### 67. Phone header offers Next step

**Reason:** On a phone, Next step was only inside Menu. The owner had to open Menu to reach the page that already holds the owner-assistance buttons.

**Affected:** Signed-in phone header.

**Migration risk:** None.

**Current functionality:** Phones show a Next step button next to Menu. Desktop still uses the left nav. GroovGro does not execute.

### 68. Saving a specialist recommendation refreshes Next step

**Reason:** Saving a specialist recommendation created a waiting action, but Next step and Your work were not refreshed, so the owner could still see the old ask.

**Affected:** Specialist save, Next step approve/reject refresh.

**Migration risk:** None.

**Current functionality:** After a specialist recommendation is saved, Next step and Your work refresh. Approving or rejecting from Next step also refreshes Your work. GroovGro does not execute.

### 69. A public lead form submission refreshes Next step

**Reason:** When someone submitted the public lead form, Next step could still ask to share the form instead of follow up.

**Affected:** Public lead form save.

**Migration risk:** None.

**Current functionality:** After a public form submission, Next step and Leads refresh so follow-up can appear. GroovGro does not email anyone.

### 70. A first recorded website visit refreshes Next step

**Reason:** After the tracking snippet records its first visit, Next step could still ask to paste the snippet until the cached page expired.

**Affected:** Website tracking endpoint.

**Migration risk:** None.

**Current functionality:** The first recorded visit refreshes Next step, the path so far, Analytics, and Website so the snippet ask can clear. Later visits do not keep refreshing those pages. GroovGro does not replace the live site.

### 71. A new Stripe payment copy refreshes Next step

**Reason:** When GroovGro records a new Stripe charge copy, Next step could still list a lead that is now a customer, or show a stale Goal number, until the cached page expired.

**Affected:** GroovGro Stripe read-copy webhook.

**Migration risk:** None.

**Current functionality:** After a new payment row is stored, Next step, Leads, Bookings, and the path so far refresh. Duplicate events do not keep refreshing. GroovGro still does not charge a card or change checkout. Live checkout and stripe-osa are unchanged.

### 72. Read Goal and Intelligence wait stay on Next step

**Reason:** When the Goal number was lower, Next step still offered Open Goals. When Intelligence had nothing else to recommend, it sent the owner to Marketing.

**Affected:** Next step Read Goal, Intelligence keep-recording recommendation.

**Migration risk:** None.

**Current functionality:** Read the Goal number stays on Next step. Intelligence wait opens Next step. Matching charges still names Bookings. UTM naming still names Marketing. Goal and plan coordinator loops still name Goals.

### 73. Add a Goal and Dashboard empty lists stay on Next step

**Reason:** Adding a Goal already had a form on Next step, but the coordinator still named Goals. Empty lead and calendar lists on the Dashboard still sent the owner to Leads or Events.

**Affected:** Next step Add a Goal href, Dashboard empty lists.

**Migration risk:** None.

**Current functionality:** Add a Goal stays on Next step. Empty lead and calendar lists on the Dashboard name Next step. Matching charges still names Bookings. Goal and plan coordinator loops still name Goals.

### 74. Unread website status alerts open Next step

**Reason:** When the website address was saved but pages were unread, the amber alert told the owner to find pages and review, but it did not open Next step.

**Affected:** Status alerts on Dashboard and Website.

**Migration risk:** None.

**Current functionality:** The unread-website alert has Open Next step. GroovGro does not change the live site.

### 75. Website review copy opens Next step

**Reason:** After saving a website address, Website still told the owner to open Business to review.

**Affected:** Website and Business copy.

**Migration risk:** None.

**Current functionality:** Website says to open Next step to find pages and review. Business says to save the address on Next step first. GroovGro does not change the live site.

### 76. Empty Goal copy stays on Next step

**Reason:** Dashboard and the path so far still named Goals as a second place to write the first Goal or draft a plan, even though those buttons are on Next step.

**Affected:** Dashboard, path-so-far copy, Growth Plan text, and Growth review schedule copy.

**Migration risk:** None.

**Current functionality:** Empty Goal and no-plan copy name Next step. A Growth Plan names Next step for open leads and draft offers. Growth review asks to set a look day on Next step. Reading an existing Goal or approved plan still opens Goals. GroovGro does not start marketing.

### 77. Growth review copy names Next step

**Reason:** Growth review still told the owner to confirm drafts or add a Goal without naming Next step, where those buttons already live.

**Affected:** Growth review copy and the When to look buttons.

**Migration risk:** None.

**Current functionality:** Confirm drafts, add a Goal, and a reached Goal name Next step. Growth review’s When to look row also has Open Next step. GroovGro does not start marketing.

### 78. Growth Plan and far-behind review name Next step

**Reason:** A drafted Growth Plan still told the owner to connect the website without naming Next step. Growth review still told the owner a Goal was far behind without naming Next step.

**Affected:** Growth Plan text and Growth review copy.

**Migration risk:** None.

**Current functionality:** Connecting the website from a plan names Next step. A far-behind Goal names Next step. GroovGro does not start marketing or change the live site.

### 79. Next step does not send the owner to Your work

**Reason:** Next step still had Open Your work. Your work then says to open Next step, so the owner bounced between the two pages.

**Affected:** Next step footer.

**Migration risk:** None.

**Current functionality:** Next step does not send the owner to Your work. GroovGro does not execute.

### 80. Next step shows the Growth Plan write-up

**Reason:** Next step still sent the owner to Goals to read the plan. Your work and the path so far did the same. The write-up can stay on Next step.

**Affected:** Next step, the path so far, and Your work.

**Migration risk:** None.

**Current functionality:** Next step shows the current Growth Plan. The path so far opens Next step to read an approved plan. Your work no longer sends the owner to Goals to read it. GroovGro does not execute.

### 81. Next step shows the Goal number

**Reason:** The path so far still sent the owner to Goals to read the current Goal. The number can stay on Next step.

**Affected:** Next step and the path so far.

**Migration risk:** None.

**Current functionality:** Next step shows the current Goal. The path so far opens Next step to read it. GroovGro does not start marketing.

### 82. Next step footer and Dashboard wait stay on Next step

**Reason:** Next step still had a Goals footer button after the Goal and plan were already on that page. Dashboard wait copy still sent the owner to Growth review.

**Affected:** Next step footer and Dashboard copy.

**Migration risk:** None.

**Current functionality:** Next step does not send the owner to Goals from the footer. Dashboard wait names Next step. GroovGro does not start marketing.

### 83. Goal and plan loops stay on Next step

**Reason:** Goal and plan recommendations still named Goals, and Next step still showed Open Goals when the signed-in person could not use the dedicated button. The Goal and plan are already on Next step.

**Affected:** Next step coordinator hrefs and the Open Goals fallback.

**Migration risk:** None.

**Current functionality:** Activate, draft, approve, propose, waiting actions, and a reached Goal name Next step. If the signed-in person cannot use the dedicated button, they stay here. GroovGro does not execute.

### 84. Next step shows this week’s look

**Reason:** Next step still sent the owner to Growth review to read this week’s look. The weekly write-up can stay on Next step.

**Affected:** Next step.

**Migration risk:** None.

**Current functionality:** Next step shows this week’s look. It does not send the owner to Growth review from the footer. GroovGro does not change the business from that look.

### 85. Business Active goals and Goals weekly copy stay on Next step

**Reason:** Business still sent Active goals to Goals. Goals still told the owner to open Growth review to read this week’s look. Both already live on Next step.

**Affected:** Business Active goals and Goals schedule copy.

**Migration risk:** None.

**Current functionality:** Business Active goals opens Next step. Goals schedule copy names Next step for this week’s look. GroovGro does not start marketing.

### 86. Decisions copy names Next step for this week’s look

**Reason:** Decisions still told the owner to save weekly and monthly reviews from Growth review. This week’s look already lives on Next step.

**Affected:** Decisions copy and top buttons.

**Migration risk:** None.

**Current functionality:** Decisions names Next step to save this week’s look. Growth review stays for the monthly write-up. GroovGro does not start marketing.

### 87. Next step shows specialist reports

**Reason:** Next step still sent the owner to Intelligence to read specialists. The owner can read each specialist and save the recommendation here.

**Affected:** Next step.

**Migration risk:** None.

**Current functionality:** Next step shows specialist reports and Save to Decision History. It does not send the owner to Intelligence from the footer. Leave-alone still names the module page. GroovGro does not execute.

### 88. Next step shows Decision History

**Reason:** Next step still sent the owner to Decisions to read the history. Recent decisions can stay on Next step.

**Affected:** Next step and Decisions copy.

**Migration risk:** None.

**Current functionality:** Next step shows recent Decision History. It does not send the owner to Decisions from the footer. GroovGro does not run those decisions.

### 89. Next step shows The path so far

**Reason:** Next step still sent the owner to the Dashboard to read The path so far. Goal, plan, work, what changed, and the next step can stay on Next step.

**Affected:** Next step.

**Migration risk:** None.

**Current functionality:** Next step shows The path so far. It does not send the owner to the Dashboard from the footer. GroovGro does not run marketing.

### 90. Goals, Growth review, and Your work stay on Next step for that content

**Reason:** Those pages still sent the owner to Intelligence, Decisions, or the Dashboard for specialists, Decision History, and The path so far. That content already lives on Next step.

**Affected:** Goals, Growth review, and Your work buttons.

**Migration risk:** None.

**Current functionality:** Goals keeps Open Next step and Open growth review for the monthly write-up. Growth review and Your work keep Open Next step. GroovGro does not execute.

### 91. Dashboard and Intelligence name Next step for specialists

**Reason:** The Dashboard still labeled Intelligence as specialists. Empty Goals plan copy did not name Next step. Specialists and drafting a plan already live on Next step.

**Affected:** Dashboard Intelligence button, Intelligence copy, and Goals empty-plan copy.

**Migration risk:** None.

**Current functionality:** Dashboard Intelligence is Intelligence. Intelligence names Next step for specialists. Empty Goals plans name Next step. GroovGro does not execute.

### 92. Save this week’s look from Next step

**Reason:** Next step showed this week’s look but still sent the owner to Growth review to save it when something else was the primary. Growth review intro still described itself as the weekly look.

**Affected:** Next step this week’s look and Growth review copy.

**Migration risk:** None.

**Current functionality:** Next step can save this week’s look to Decision History. Growth review names Next step for the weekly look. The monthly write-up stays on Growth review. GroovGro does not change the business from that look.

### 93. Keep the weekly write-up on Next step

**Reason:** Next step still showed a short weekly look. The owner had to open Growth review to read the rest of that write-up. The weekly sections already exist.

**Affected:** Next step this week’s look and Growth review.

**Migration risk:** None.

**Current functionality:** Next step shows the full weekly write-up. Growth review is the monthly look. GroovGro does not change the business from that look.

### 94. Keep specialists on Next step

**Reason:** Intelligence still showed the specialist cards after Next step already had them. The owner could save specialists from Intelligence instead of staying on Next step.

**Affected:** Intelligence specialist cards.

**Migration risk:** None.

**Current functionality:** Next step shows specialists and Save to Decision History. Intelligence is the briefing from connected data. Leave-alone still names the module page. GroovGro does not execute.

### 95. Keep The path so far on Next step

**Reason:** Dashboard and Decisions still showed The path so far after Next step already had it. The owner could read that story from those pages instead of staying on Next step.

**Affected:** Dashboard and Decisions story cards.

**Migration risk:** None.

**Current functionality:** Next step shows The path so far. Dashboard and Decisions name Next step for that story. GroovGro does not run marketing.

### 96. Keep proposed-action approval on Next step

**Reason:** Decisions still showed Approve and Reject on proposed actions after Next step already had those buttons. The owner could approve from Decisions instead of staying on Next step.

**Affected:** Decisions proposed actions.

**Migration risk:** None.

**Current functionality:** Next step can approve or reject proposed actions. Decisions lists them and names Next step. Approving does not run them. GroovGro does not execute.

### 97. Keep Your work approval on Next step

**Reason:** Your work still showed Approve and Reject on waiting actions after Next step already had those buttons. The owner could approve from Your work instead of staying on Next step.

**Affected:** Your work waiting list.

**Migration risk:** None.

**Current functionality:** Next step can approve or reject proposed actions. Your work lists waiting actions and names Next step. I did this stays on Your work. GroovGro does not execute.

### 98. Keep Goals approval on Next step

**Reason:** Goals still showed Approve and Reject on proposed plan actions after Next step already had those buttons. The owner could approve from Goals instead of staying on Next step.

**Affected:** Goals plan actions.

**Migration risk:** None.

**Current functionality:** Next step can approve or reject proposed actions. Goals lists them and names Next step. Draft and approve a plan still stay on Goals. GroovGro does not execute.

### 99. Keep Goals owner work on Next step

**Reason:** Goals still showed I did this on approved plan actions after Next step and Your work already had those buttons. The owner could mark work done from Goals instead of staying on Next step.

**Affected:** Goals plan actions.

**Migration risk:** None.

**Current functionality:** Next step and Your work can mark approved work done. Goals lists it and names Next step. GroovGro does not execute.

### 100. Keep Goals confirm drafts on Next step

**Reason:** Goals still showed Confirm and Reject on suggested goals after Next step already had those buttons. The owner could confirm a draft from Goals instead of staying on Next step.

**Affected:** Goals suggested goals.

**Migration risk:** None.

**Current functionality:** Next step can confirm or reject suggested goals. Goals lists them and names Next step. Add a Goal, draft a plan, and approve a plan still stay on Goals. GroovGro does not execute.

### 101. Keep Offers confirm drafts on Next step

**Reason:** Offers still showed Confirm and Reject on suggested offers after Next step already had those buttons. The owner could confirm a draft from Offers instead of staying on Next step.

**Affected:** Offers suggested offers.

**Migration risk:** None.

**Current functionality:** Next step can confirm or reject suggested offers. Offers lists them and names Next step. Add an offer still stays on Offers. GroovGro does not execute.

### 102. Keep Business confirm drafts on Next step

**Reason:** Business still showed Confirm and Reject on suggested offers and goals after Next step already had those buttons. The owner could confirm a draft from Business instead of staying on Next step.

**Affected:** Business suggested drafts.

**Migration risk:** None.

**Current functionality:** Next step can confirm or reject suggested offers and goals. Business lists them so the owner can read them, and names Next step. Review connected data still stays on Business. GroovGro does not execute.

### 103. Keep dedicated Next step buttons from creating duplicate actions

**Reason:** Confirm drafts, connect website, review site, approve actions, owner work, and check what changed already have dedicated buttons on Next step. I’ll do this on those loops could still save a duplicate proposed action.

**Affected:** Next step I’ll do this.

**Migration risk:** None.

**Current functionality:** I’ll do this on those dedicated loops does not also save a duplicate proposed action. GroovGro does not execute.

### 104. Keep find-pages on Next step

**Reason:** Business still showed the Find pages checklist after Next step and Website already had that loop. The owner could finish an unread-site review from Business instead of staying on Next step.

**Affected:** Business review card.

**Migration risk:** None.

**Current functionality:** Next step and Website can find pages and check the important ones. Business keeps Review connected data and names Next step to find pages. GroovGro does not change the live site.

### 105. Keep the review schedule on Next step

**Reason:** Goals still showed the day-and-time form after Next step and Growth review already had it. The owner could change the schedule from Goals instead of staying on Next step.

**Affected:** Goals schedule card.

**Migration risk:** None.

**Current functionality:** Next step can save when you look at this week’s numbers. Growth review can change that day later. Goals names Next step. GroovGro does not change the business from that schedule.

### 106. Keep Website find-pages on Next step

**Reason:** Website still showed the Find pages checklist after Next step already had that loop, and after Website copy already named Next step. The owner could finish an unread-site review from Website instead of staying on Next step.

**Affected:** Website pages card.

**Migration risk:** None.

**Current functionality:** Next step can find pages and check the important ones. Website keeps the address and tracking snippet, and names Next step to find pages. GroovGro does not change the live site.

### 107. Keep Review connected data on Next step

**Reason:** Dashboard, Goals, and Offers still ran Review connected data after Next step already had that loop for an unread site. The owner could skip Find pages and review from those screens instead of staying on Next step.

**Affected:** Dashboard, Goals, and Offers review buttons.

**Migration risk:** None.

**Current functionality:** Next step can find pages, check the important ones, then Review connected data when the site is unread. Business keeps Review connected data to run it again. Dashboard, Goals, and Offers name Next step. GroovGro does not change the live site.

### 108. Keep plan approve and propose on Next step

**Reason:** Goals still showed Approve and Reject on a draft plan, and Propose the first actions on an approved plan, after Next step already had those buttons. The owner could finish those loops from Goals instead of staying on Next step.

**Affected:** Goals plan list.

**Migration risk:** None.

**Current functionality:** Next step can approve or reject a draft plan, and propose the first actions. Goals lists plans and names Next step. Write a plan yourself still stays on Goals. GroovGro does not execute.

### 109. Keep Activate Goal and Draft next Goal on Next step

**Reason:** Goals still showed Make this the active Goal and Draft the next Goal after Next step already had those buttons. The owner could activate a draft or draft the next Goal from Goals instead of staying on Next step.

**Affected:** Goals goal list.

**Migration risk:** None.

**Current functionality:** Next step can make a draft the active Goal, and draft the next Goal when one is reached. Goals lists those goals and names Next step. GroovGro does not execute.

### 110. Keep Draft a plan on Next step

**Reason:** Goals still showed Draft a plan for this Goal after Next step already had that button. The owner could draft a plan from Goals instead of staying on Next step.

**Affected:** Goals goal list.

**Migration risk:** None.

**Current functionality:** Next step can draft a plan for the active Goal. Goals lists goals and names Next step. Write a plan yourself still stays on Goals. GroovGro does not execute.

### 111. Keep Goal history on Next step

**Reason:** After Check what changed, a reached Goal told the owner to read the history on Next step, but the stored numbers only appeared on Goals. The owner had to leave Next step to see what changed.

**Affected:** Next step Goal readout.

**Migration risk:** None.

**Current functionality:** Next step shows the saved Goal numbers with the current Goal. Goals still lists the full history and the Current box. GroovGro does not execute.

### 112. Keep website review click-by-click on Next step

**Reason:** Phase 2 setup still told the owner to find pages, then open Business to review. Find pages and Review connected data already live on Next step. Following that guide sent the owner away.

**Affected:** `docs/phase-2/USER_SETUP.md`.

**Migration risk:** None.

**Current functionality:** Setup click-by-click finds pages and reviews on Next step. Website still saves the address and shows the tracking snippet. Business still has Review to run it again. GroovGro does not change the live site.

### 113. Keep saving today's Goal number on Next step

**Reason:** After the first save, Next step stopped showing Save progress from connected data. Later saves only lived on Goals, so the owner had to leave Next step to store today's number.

**Affected:** Next step Goal card.

**Migration risk:** None.

**Current functionality:** Next step can save today's Goal number with the current Goal after the first save. Goals still has that button and the Current box. GroovGro does not start marketing.

### 114. Keep Check what changed on Next step when it is not the main ask

**Reason:** When drafts or approved work outranked Check what changed, that button only lived on Your work. The path so far still said to check on Next step. The owner had to leave Next step to compare the Goal number.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can check what changed even when that is not the main ask. Your work still has that button. GroovGro does not change the plan.

### 115. Keep I did this on Next step when it is not the main ask

**Reason:** When drafts outranked approved work, I did this only lived on Your work. The path so far still said those actions were ready on Next step. The owner had to leave Next step to mark them done.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can mark approved work done even when that is not the main ask. Your work still has those buttons. GroovGro does not execute.

### 116. Keep website review on Next step when it is not the main ask

**Reason:** When drafts, approved work, or Check what changed outranked an unread website, Find pages and Review only lived in the main recommendation. Website no longer lists pages. Business still has Review to run it again. The owner had to leave Next step to do the first review.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can find pages, check the important ones, then review even when that is not the main ask. Business still has Review to run it again. GroovGro does not change the live site.

### 117. Keep Activate Goal on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, or an unread website outranked a draft Goal, Make this the active Goal only lived in the main recommendation. Goals no longer has that button. The owner had to finish the other ask first, or leave Next step with no way to activate.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can make a draft the active Goal even when that is not the main ask. Goals lists that draft and names Next step. GroovGro does not start marketing.

### 118. Keep Draft a plan on Next step when it is not the main ask

**Reason:** When activate, drafts, approved work, Check what changed, or an unread website outranked a missing plan, Draft a plan only lived in the main recommendation. Goals no longer has that button. Write a plan yourself still stays on Goals. The owner had to finish the other ask first, or leave Next step with no way to draft a plan.

**Affected:** Next step plan card.

**Migration risk:** None.

**Current functionality:** Next step can draft a plan for the active Goal even when that is not the main ask. Goals lists goals and names Next step. Write a plan yourself still stays on Goals. GroovGro does not execute.

### 119. Keep Approve a plan on Next step when it is not the main ask

**Reason:** When a missing plan, activate, drafts, approved work, Check what changed, or an unread website outranked a draft plan, Approve and Reject only lived in the main recommendation. Goals no longer has those buttons. The owner had to finish the other ask first, or leave Next step with no way to approve the draft.

**Affected:** Next step plan card.

**Migration risk:** None.

**Current functionality:** Next step can approve or reject a draft plan even when that is not the main ask. Goals lists draft plans and names Next step. GroovGro does not execute.

### 120. Keep Propose first actions on Next step when it is not the main ask

**Reason:** When a draft plan, a missing plan, activate, drafts, approved work, Check what changed, or an unread website outranked proposing first actions, that button only lived in the main recommendation. Goals no longer has it. The owner had to finish the other ask first, or leave Next step with no way to propose actions.

**Affected:** Next step plan card.

**Migration risk:** None.

**Current functionality:** Next step can propose the first actions even when that is not the main ask. Goals lists approved plans and names Next step. GroovGro does not execute.

### 121. Keep Draft the next Goal on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a plan loop outranked a reached Goal, Draft the next Goal only lived in the main recommendation. Goals no longer has that button. The owner had to finish the other ask first, or leave Next step with no way to draft the next Goal.

**Affected:** Next step Goal card.

**Migration risk:** None.

**Current functionality:** Next step can draft the next Goal even when that is not the main ask. If a next Goal is already drafted, Make this the active Goal stays instead. Goals lists a reached Goal and names Next step. GroovGro does not start marketing.

### 122. Keep Add a Goal on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked work that was not tied to a Goal, Add a Goal only lived in the main recommendation. Goals still has that form. The owner had to leave Next step to save a Goal.

**Affected:** Next step Goal card.

**Migration risk:** None.

**Current functionality:** Next step can add a Goal even when that is not the main ask. Goals still has Add a Goal. GroovGro does not start marketing.

### 123. Keep Connect website on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, or a Goal/plan loop outranked a missing website, the address form only lived in the main recommendation. Website still has that field. The owner had to leave Next step to save the address.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can save the existing website address even when that is not the main ask. Website still has the address field and tracking snippet. GroovGro does not move the live site.

### 124. Keep tracking snippet on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked a connected site with no recorded visits, the tracking snippet only lived in the main recommendation. Website still has that snippet. The owner had to leave Next step to copy it.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can copy the tracking snippet even when that is not the main ask. Website still has the snippet. GroovGro does not replace the live site.

### 125. Keep Follow up open leads on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked open leads, follow-up only lived in the main recommendation. Leads & customers still has Move and Mark customer. The owner had to leave Next step to give a person a next step.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can move or mark open leads even when that is not the main ask. Leads & customers still has Move and Mark customer. GroovGro does not email anyone.

### 126. Keep Share the public lead form on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked a workspace with no captured person, the public form and Add a person only lived in the main recommendation. Leads & customers still has those. The owner had to leave Next step to share the form or add someone.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can copy the public lead form or add a person even when that is not the main ask. Leads & customers still has the form and Add a person. GroovGro does not email anyone.

### 127. Keep Connect payments on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked connecting or syncing a payment copy, Connect Stripe and Sync only lived in the main recommendation. Bookings still has that panel. The owner had to leave Next step to mark the workspace connected or copy recent payments.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can connect so GroovGro can read a copy of payments, or sync recent payment records, even when that is not the main ask. Bookings still has Connect Stripe and Sync. GroovGro does not charge a card or change checkout.

### 128. Keep Save your brand on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked an incomplete brand, the brand form only lived in the main recommendation. Brand still has that form. The owner had to leave Next step to save the business name, what it does, and who it serves.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can save the brand even when that is not the main ask. Brand still has that form. GroovGro does not start marketing, send email, or edit the live website.

### 129. Keep Save how this business works on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked a missing Business Brain, that form only lived in the main recommendation. Business still has that form. The owner had to leave Next step to save the kind of business this is and how it creates value.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can save how this business works even when that is not the main ask. Business still has that form. GroovGro does not start marketing, send email, or edit the live website.

### 130. Keep Add an offer on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked a workspace with no confirmed offer, Add an offer only lived in the main recommendation. Offers still has that form. The owner had to leave Next step to name something the business promotes.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can add an offer even when that is not the main ask. Offers still has that form. GroovGro does not start marketing.

### 131. Keep Save your brand voice on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked a missing brand voice, that form only lived in the main recommendation. Brand voice still has that form. The owner had to leave Next step to save how this business sounds.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can save the brand voice even when that is not the main ask. Brand voice still has that form. GroovGro does not send email, post to social, or edit the live website.

### 132. Keep Add a brand voice example on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked a missing voice example, that form only lived in the main recommendation. Brand voice still has that form. The owner had to leave Next step to paste writing they already like.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can add a brand voice example even when that is not the main ask. Brand voice still has that form. GroovGro does not send email, post to social, or edit the live website.

### 133. Keep Draft copy in your voice on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked a missing voice draft, that form only lived in the main recommendation. Brand voice still has that form. The owner had to leave Next step to create a draft from the voice they saved.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can draft copy in the saved voice even when that is not the main ask. Brand voice still has that form. GroovGro keeps the draft in this workspace. It does not send email, post to social, or edit the live website.

### 134. Keep Choose when you look at growth on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked a missing look schedule, that form only lived in the main recommendation. Growth review still has that form. The owner had to leave Next step to save the day and time they look at this week's numbers.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can save when to look at this week's numbers even when that is not the main ask. Growth review still has that form. GroovGro does not change the business then.

### 135. Keep Run an SEO check on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked a missing homepage SEO check, that button only lived in the main recommendation. SEO still has that check. The owner had to leave Next step to run it.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can run a homepage SEO check even when that is not the main ask. SEO still has that check. GroovGro does not edit the website.

### 136. Keep SEO drafts on Next step when they are not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked blocking or improve-when-you-have-time SEO items, those draft and approve buttons only lived in the main recommendation. SEO still has those checks. The owner had to leave Next step to draft and approve the copy.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can draft and approve homepage SEO copy even when that is not the main ask. SEO still has those checks. GroovGro does not change the connected website or start ads.

### 137. Keep Search Console on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked connecting Search Console, choosing the property, or refreshing numbers, that panel only lived in the main recommendation. SEO still has that panel. The owner had to leave Next step to connect, pick, or refresh.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can connect Search Console, choose the property, or refresh numbers even when that is not the main ask. SEO still has that panel. GroovGro does not edit the website, submit a sitemap, or buy ads.

### 138. Keep Add a calendar item on Next step when it is not the main ask

**Reason:** When drafts, approved work, Check what changed, an unread website, or a Goal/plan loop outranked a schedule that is well short of its target, Add a calendar item only lived in the main recommendation. Events still has that form. The owner had to leave Next step to add an item.

**Affected:** Next step secondary card.

**Migration risk:** None.

**Current functionality:** Next step can review upcoming items and add a calendar item even when that is not the main ask. Events still has that form. GroovGro does not change ads or the website.

### 139. Match charges to people on Bookings

**Reason:** Intelligence asks the owner to match Stripe charge copies that have no person email. That work belongs on Bookings. Bookings listed amounts and Stripe IDs but had no way to attach a person, so Goal numbers and marketing source stayed unattributed.

**Affected:** Bookings payments table.

**Migration risk:** None. Existing matched copies keep their person. Unmatched copies stay unmatched until the owner chooses someone.

**Current functionality:** Bookings can match a payment copy to a person already in the workspace. GroovGro does not charge a card, create a Stripe account, or change checkout on the connected website.

### 140. Name a campaign on a shared Marketing link

**Reason:** Intelligence asks the owner to name the campaign on shared links so Marketing can show a real channel. Marketing told the owner to add query names by hand and never built a copyable URL. Naming stays on Marketing. GroovGro does not buy ads.

**Affected:** Marketing named-link card. Intelligence recommendation copy.

**Migration risk:** None. Existing public lead form links keep working. Query names are added only when the owner types a place or a share name.

**Current functionality:** Marketing can type where the owner will share and a name for this share, then copy a public lead form URL with those names. GroovGro will not buy ads, send email, or change the live website.

### 141. Store the named place on public-form leads

**Reason:** Named Marketing links already add `utm_source` and `utm_campaign`. Visits from the website snippet already use that place as the channel. Public-form leads still stored `website_campaign`, so the Marketing table could not show the place the owner typed.

**Affected:** Public lead form. Lead source and attribution channel. Intelligence generic-source list.

**Migration risk:** None. Existing `website_campaign` rows stay. New named-link submissions store the place as the source. Builder forms that only send a campaign name still use `website_campaign`.

**Current functionality:** When someone uses a named public lead form link, GroovGro stores the place as the lead source and the share name as the campaign. Marketing can then show that channel. GroovGro will not buy ads.

### 142. Show the share name on Marketing (this slice)

**Reason:** Named links store both the place and the share name. The Marketing table rolled those up by place only, so two Instagram shares looked like one row. The owner could not see which named link brought someone in.

**Affected:** Marketing source table. Attribution merge. First-visit Marketing refresh.

**Migration risk:** None. Rows with no share name still show. Two shares from the same place become two rows.

**Current functionality:** Marketing shows the share name next to the source. The first website visit also refreshes Marketing. GroovGro will not buy ads.

### 143. Show the share name on Leads and Next step

**Reason:** Named public-form leads store the share name. Marketing already shows it. Follow-up on Next step and the Leads pipeline only showed the place, so the owner could not tell which named share brought that person in.

**Affected:** Next step follow-up cards. Leads pipeline.

**Migration risk:** None. Leads with no share name still show the place only.

**Current functionality:** Next step follow-up and Leads show the share name next to the place. GroovGro will not email anyone or buy ads.

### 144. Name a campaign on a website link (this slice)

**Reason:** Marketing can already name a public lead form link. Sharing the connected website still needed a hand-built query string. Naming stays on Marketing. GroovGro does not change the live website.

**Affected:** Marketing website-link card. Website page cross-link.

**Migration risk:** None. If no website address is saved, Marketing tells the owner to save it on Next step first.

**Current functionality:** Marketing can type where the owner will share the existing website and a name, then copy that URL. GroovGro will not buy ads or change the live website.

### 145. Show the share name on Dashboard recent leads

**Reason:** Named leads store the share name. Marketing, Next step, and Leads already show it. Dashboard recent leads still showed only the place.

**Affected:** Dashboard recent leads list.

**Migration risk:** None. Leads with no share name still show the place only.

**Current functionality:** Dashboard recent leads show the share name next to the place. GroovGro will not email anyone or buy ads.

### 146. Point Analytics at Marketing for share names

**Reason:** Analytics still said campaign detail expands later after Marketing already shows the share name. That leftover copy sent the owner looking for work GroovGro already has.

**Affected:** Analytics traffic card.

**Migration risk:** None. Analytics stays a summary. Campaign rows stay on Marketing.

**Current functionality:** Analytics names Marketing for the share name. GroovGro will not buy ads.

### 147. Show the share name on Customers

**Reason:** Named leads store the share name. Pipeline already shows it. After Mark customer, the Customers table still showed only the place, so the owner lost which named share brought that person in.

**Affected:** Leads & customers Customers table.

**Migration risk:** None. Customers with no first-lead share name still show the source only.

**Current functionality:** Customers show the share name from the first lead next to the source. GroovGro will not email anyone or buy ads.

### 148. Show the share name in Intelligence

**Reason:** Named leads store the share name. Marketing, Next step, Leads, Dashboard, and Customers already show it. Intelligence still named only the place, so two shares from the same place looked like one channel in the briefing.

**Affected:** Intelligence lead-source and revenue-source observations.

**Migration risk:** None. Sources with no share name still show the place only.

**Current functionality:** Intelligence names the share next to the place for the top lead and revenue source. GroovGro will not buy ads.

### 149. Point Next step at Marketing for named shares

**Reason:** Next step still copies the unnamed public form when no person has been captured yet. Naming a share already lives on Marketing. Without a pointer, the owner shared an unnamed link and Intelligence later asked them to name it.

**Affected:** Next step share-form cards. Leads public-form card. Named website Copy link label.

**Migration risk:** None. The unnamed form still copies. The copyable named-link fields stay on Marketing.

**Current functionality:** Next step and Leads name Marketing for naming a share. GroovGro will not buy ads or email anyone.

### 150. Refresh Marketing when a named share lands a person

**Reason:** Marketing already counts customers and revenue by share name. Marking a customer, matching a charge, or recording a Stripe copy did not refresh Marketing, so the share-name table could stay stale.

**Affected:** Lead convert and move. Match charge. Stripe copy ingest and sync.

**Migration risk:** None. Marketing still updates on a public-form submit and the first website visit.

**Current functionality:** Marketing refreshes when a person is added, converted, or matched to a payment copy. GroovGro will not buy ads or change checkout.

### 151. Refresh Marketing when a named website share records a visit

**Reason:** Marketing already splits visits by share name. The tracking snippet only refreshed Marketing on the first visit ever, so a later named website share could look missing after someone clicked it.

**Affected:** Website tracking snippet ingest.

**Migration risk:** None. The first visit still refreshes Next step. Repeat visits on an already-seen share do not extra-refresh Marketing.

**Current functionality:** Marketing refreshes the first time a named website share records a visit. GroovGro will not buy ads or change the live site.

### 152. Point Dashboard at Marketing for share names

**Reason:** Dashboard “what changed, and why?” still named only the place after Marketing already shows the share name. That leftover summary sent the owner looking for work GroovGro already has.

**Affected:** Dashboard why card.

**Migration risk:** None. The channel summary stays. Share-name rows stay on Marketing.

**Current functionality:** Dashboard names Marketing for the share name. GroovGro will not buy ads.

### 153. Show which named share moved a Goal

**Reason:** Marketing already stores the share name on people and payments. A connected Goal still showed only a total, so the owner could not see which named share moved that number.

**Affected:** Goal progress helper, Goals page, Next step Goal readout, Dashboard Goal card, Dashboard why card, Check what changed, Your work, drafted Growth Plan, specialists, the path so far, Intelligence briefing.

**Migration risk:** None. The Goal number is unchanged. Naming a share stays on Marketing. Matching charges stays on Bookings.

**Current functionality:** Goals, Next step, Dashboard, Check what changed, Your work, drafted plans, specialists, the path so far, and Intelligence name the share that moved a connected Goal number, including extra named shares. GroovGro will not buy ads.

### 154. Name the share next to a Goal that is updated by hand

**Reason:** Connected Goals already name the share that moved the number. A Goal the owner types by hand still showed only that typed number, so the owner could not see which named share brought people, bookings, or payments in.

**Affected:** Goal share helper. Existing Goal read surfaces already print `shareNote`.

**Migration risk:** None. The typed Goal number is unchanged. Naming a share stays on Marketing. Matching charges stays on Bookings.

**Current functionality:** A Goal updated by hand names the share that brought people, bookings, or payments in the same window, including extra named shares. The typed number is unchanged. GroovGro will not buy ads.

### 155. Count a Traffic Goal from website visits

**Reason:** A Traffic Goal was treated as connected, but the live number came from bookings. Website visits from a named share already exist. The owner could not see visit count or which named share moved a Traffic Goal.

**Affected:** Goal progress helper, growth snapshot, Save connected progress, first named-share visit refresh of Goals and Next step. Existing Goal read surfaces already print `shareNote`.

**Migration risk:** An existing Traffic Goal that saved a booking count will show website visits after this slice. Naming a share stays on Marketing. Matching charges stays on Bookings.

**Current functionality:** A Traffic Goal counts website visits in the connected window and names the share that moved that number, including extra named shares. GroovGro will not buy ads or change the live site.

### 156. Name website visits next to a Goal that is updated by hand

**Reason:** A Traffic Goal already counts named website visits. A Goal the owner types by hand (Visibility, Custom, and the other hand-updated types) still named only people, bookings, and payments, so a named website share could look missing next to that typed number.

**Affected:** Goal share helper. Existing Goal read surfaces already print `shareNote`.

**Migration risk:** None. The typed Goal number is unchanged. Naming a share stays on Marketing. Matching charges stays on Bookings.

**Current functionality:** A Goal updated by hand names the share from website visits in the same window, along with people, bookings, and payments, including extra named shares. The typed number is unchanged. GroovGro will not buy ads or change the live site.

## BUILD NEXT (after this slice is tested)

- **Website builder is parked.** Optional GroovGro-hosted pages stay. Do not add builder features until Jason asks.
- **Show the share name on Marketing is parked.** Marketing, Next step, Leads, Dashboard, Customers, and Intelligence show the share name. Naming stays on Marketing. Do not buy ads.
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
- **Next step does not also send the owner to the module page is parked.** Do not show a second Open Website or Open SEO button. Your work names Next step. Do not execute.
- **The path so far, specialists, and Intelligence name Next step is parked.** Missing Goal or plan, and the work beat, open Next step. Specialists and Intelligence say Open Next step when that is the related page. Do not execute.
- **Growth review can change the schedule here is parked.** Save the day and time on Growth review. Do not send the owner to Goals. Do not change the business then.
- **Your work filled button is Next step is parked.** Open Next step is the filled button. Open the approved plan stays outline so the owner can read it. Do not execute.
- **What changed and next-Goal copy name Next step is parked.** Read the history and review a drafted next Goal on Next step. SEO Connect website opens Next step. Do not start marketing.
- **Dashboard Connect website opens Next step is parked.** The outline Connect website button opens Next step. Do not move the live site.
- **Owner module pages offer Next step is parked.** Website, Leads, Bookings, SEO, Brand voice, Business, Events, and Offers have Open Next step. Do not execute.
- **Remaining owner pages offer Next step is parked.** Growth review, Intelligence, Decisions, Settings, Brand, Team, Media, Integrations, Marketing, Analytics, Notifications, and Audit have Open Next step. Do not execute.
- **Confirm drafts, review site, owner work, and wait stay on Next step is parked.** Those coordinator loops name Next step. Intelligence website and Stripe connect observations open Next step. Matching charges still names Bookings. Do not execute.
- **Your work Open the page stays on Next step is parked.** Approved specialist, SEO, website, and brand-voice work open Next step. Saving I’ll do this does not name a different page. Leave-alone still names the module page. Do not execute.
- **Next step is first after Dashboard in the nav is parked.** Next step sits under Dashboard. Offers, Website, Leads, and Bookings stay below it. Do not execute.
- **Intelligence people observations open Next step when that is the loop is parked.** Open leads or no person captured yet open Next step. A filled pipeline with no open leads still opens Leads. Matching charges still names Bookings. Do not email anyone.
- **Phone header offers Next step is parked.** Phones show Next step next to Menu. Do not execute.
- **Saving a specialist recommendation refreshes Next step is parked.** After save, Next step and Your work refresh. Approving from Next step also refreshes Your work. Do not execute.
- **A public lead form submission refreshes Next step is parked.** After someone submits the public form, Next step and Leads refresh so follow-up can appear. Do not email anyone.
- **A first recorded website visit refreshes Next step is parked.** After the snippet records its first visit, Next step refreshes so it can stop asking to paste the snippet. Do not replace the live site.
- **A new Stripe payment copy refreshes Next step is parked.** After GroovGro stores a new payment row, Next step refreshes so follow-up and Goal numbers can update. Do not charge a card or change checkout.
- **Read Goal and Intelligence wait stay on Next step is parked.** Read the Goal number stays on Next step. Intelligence wait opens Next step. Matching charges still names Bookings. Do not start ads.
- **Add a Goal and Dashboard empty lists stay on Next step is parked.** Add a Goal stays on Next step. Empty lead and calendar lists on the Dashboard name Next step. Do not email anyone.
- **Unread website status alerts open Next step is parked.** The amber unread-website alert has Open Next step. Do not change the live site.
- **Website review copy opens Next step is parked.** After saving a website address, Website names Next step instead of Business. Do not change the live site.
- **Empty Goal copy stays on Next step is parked.** Dashboard and the path so far name Next step when there is no Goal yet, or when a plan still needs drafting. Do not start marketing.
- **Growth review copy names Next step is parked.** Confirm drafts, add a Goal, and a reached Goal name Next step. Do not start marketing.
- **Growth Plan and far-behind review name Next step is parked.** Connecting the website from a plan, and a far-behind Goal, name Next step. Do not start marketing or change the live site.
- **Next step does not send the owner to Your work is parked.** Next step does not send the owner to Your work. Do not execute.
- **Next step shows the Growth Plan write-up is parked.** Next step shows the current Growth Plan. The path so far opens Next step to read an approved plan. Your work no longer sends the owner to Goals to read it. Do not execute.
- **Next step shows the Goal number is parked.** Next step shows the current Goal. The path so far opens Next step to read it. Do not start marketing.
- **Next step footer and Dashboard wait stay on Next step is parked.** Next step does not send the owner to Goals from the footer. Dashboard wait names Next step. Do not start marketing.
- **Goal and plan loops stay on Next step is parked.** Activate, draft, approve, propose, waiting actions, and a reached Goal name Next step. Do not execute.
- **Next step shows this week’s look is parked.** Next step shows this week’s look. It does not send the owner to Growth review from the footer. Do not change the business from that look.
- **Business Active goals and Goals weekly copy stay on Next step is parked.** Business Active goals opens Next step. Goals schedule copy names Next step for this week’s look. Do not start marketing.
- **Decisions copy names Next step for this week’s look is parked.** Decisions names Next step to save this week’s look. Growth review stays for the monthly write-up. Do not start marketing.
- **Next step shows specialist reports is parked.** Next step shows specialist reports and Save to Decision History. It does not send the owner to Intelligence from the footer. Leave-alone still names the module page. Do not execute.
- **Next step shows Decision History is parked.** Next step shows recent Decision History. It does not send the owner to Decisions from the footer. Do not run those decisions.
- **Next step shows The path so far is parked.** Next step shows The path so far. It does not send the owner to the Dashboard from the footer. Do not run marketing.
- **Goals, Growth review, and Your work stay on Next step for that content is parked.** Goals keeps Open Next step and Open growth review for the monthly write-up. Growth review and Your work keep Open Next step. Do not execute.
- **Dashboard and Intelligence name Next step for specialists is parked.** Dashboard Intelligence is Intelligence. Intelligence names Next step for specialists. Empty Goals plans name Next step. Do not execute.
- **Save this week’s look from Next step is parked.** Next step can save this week’s look to Decision History. Growth review names Next step for the weekly look. The monthly write-up stays on Growth review. Do not change the business from that look.
- **Keep the weekly write-up on Next step is parked.** Next step shows the full weekly write-up. Growth review is the monthly look. Do not change the business from that look.
- **Keep specialists on Next step is parked.** Next step shows specialists and Save to Decision History. Intelligence is the briefing from connected data. Leave-alone still names the module page. Do not execute.
- **Keep The path so far on Next step is parked.** Next step shows The path so far. Dashboard and Decisions name Next step for that story. Do not run marketing.
- **Keep proposed-action approval on Next step is parked.** Next step can approve or reject proposed actions. Decisions lists them and names Next step. Do not execute.
- **Keep Your work approval on Next step is parked.** Next step can approve or reject proposed actions. Your work lists waiting actions and names Next step. Do not execute.
- **Keep Goals approval on Next step is parked.** Next step can approve or reject proposed actions. Goals lists them and names Next step. Do not execute.
- **Keep Goals owner work on Next step is parked.** Next step and Your work can mark approved work done. Goals lists it and names Next step. Do not execute.
- **Keep Goals confirm drafts on Next step is parked.** Next step can confirm or reject suggested goals. Goals lists them and names Next step. Do not execute.
- **Keep Offers confirm drafts on Next step is parked.** Next step can confirm or reject suggested offers. Offers lists them and names Next step. Do not execute.
- **Keep Business confirm drafts on Next step is parked.** Next step can confirm or reject suggested offers and goals. Business lists them and names Next step. Do not execute.
- **Keep dedicated Next step buttons from creating duplicate actions is parked.** I’ll do this on confirm drafts, connect website, review site, approve actions, owner work, and check what changed does not also save a duplicate proposed action. Do not execute.
- **Keep find-pages on Next step is parked.** Next step and Website can find pages. Business keeps Review connected data and names Next step to find pages. Do not change the live site.
- **Keep the review schedule on Next step is parked.** Next step can save when you look at this week’s numbers. Growth review can change that day later. Goals names Next step. Do not change the business from that schedule.
- **Keep Website find-pages on Next step is parked.** Next step can find pages. Website keeps the address and tracking snippet, and names Next step to find pages. Do not change the live site.
- **Keep Review connected data on Next step is parked.** Next step can find pages, check the important ones, then review. Business keeps Review connected data to run it again. Dashboard, Goals, and Offers name Next step. Do not change the live site.
- **Keep plan approve and propose on Next step is parked.** Next step can approve or reject a draft plan, and propose the first actions. Goals lists plans and names Next step. Write a plan yourself still stays on Goals. Do not execute.
- **Keep Activate Goal and Draft next Goal on Next step is parked.** Next step can make a draft the active Goal, and draft the next Goal when one is reached. Goals lists those goals and names Next step. Do not execute.
- **Keep Draft a plan on Next step is parked.** Next step can draft a plan for the active Goal. Goals lists goals and names Next step. Write a plan yourself still stays on Goals. Do not execute.
- **Keep Goal history on Next step is parked.** Next step shows the saved Goal numbers with the current Goal. Goals still lists the full history and the Current box. Do not execute.
- **Keep website review click-by-click on Next step is parked.** Setup click-by-click finds pages and reviews on Next step. Website still saves the address and shows the tracking snippet. Business still has Review to run it again. Do not change the live site.
- **Keep saving today's Goal number on Next step is parked.** Next step can save today's Goal number with the current Goal after the first save. Goals still has that button and the Current box. Do not start marketing.
- **Keep Check what changed on Next step when it is not the main ask is parked.** Next step can check what changed even when that is not the main ask. Your work still has that button. Do not change the plan.
- **Keep I did this on Next step when it is not the main ask is parked.** Next step can mark approved work done even when that is not the main ask. Your work still has those buttons. Do not execute.
- **Keep website review on Next step when it is not the main ask is parked.** Next step can find pages, check the important ones, then review even when that is not the main ask. Business still has Review to run it again. Do not change the live site.
- **Keep Activate Goal on Next step when it is not the main ask is parked.** Next step can make a draft the active Goal even when that is not the main ask. Goals lists that draft and names Next step. Do not start marketing.
- **Keep Draft a plan on Next step when it is not the main ask is parked.** Next step can draft a plan for the active Goal even when that is not the main ask. Goals lists goals and names Next step. Write a plan yourself still stays on Goals. Do not execute.
- **Keep Approve a plan on Next step when it is not the main ask is parked.** Next step can approve or reject a draft plan even when that is not the main ask. Goals lists draft plans and names Next step. Do not execute.
- **Keep Propose first actions on Next step when it is not the main ask is parked.** Next step can propose the first actions even when that is not the main ask. Goals lists approved plans and names Next step. Do not execute.
- **Keep Draft the next Goal on Next step when it is not the main ask is parked.** Next step can draft the next Goal even when that is not the main ask. If a next Goal is already drafted, Make this the active Goal stays instead. Goals lists a reached Goal and names Next step. Do not start marketing.
- **Keep Add a Goal on Next step when it is not the main ask is parked.** Next step can add a Goal even when that is not the main ask. Goals still has Add a Goal. Do not start marketing.
- **Keep Connect website on Next step when it is not the main ask is parked.** Next step can save the existing website address even when that is not the main ask. Website still has the address field and tracking snippet. Do not move the live site.
- **Keep tracking snippet on Next step when it is not the main ask is parked.** Next step can copy the tracking snippet even when that is not the main ask. Website still has the snippet. Do not replace the live site.
- **Keep Follow up open leads on Next step when it is not the main ask is parked.** Next step can move or mark open leads even when that is not the main ask. Leads & customers still has Move and Mark customer. Do not email anyone.
- **Keep Share the public lead form on Next step when it is not the main ask is parked.** Next step can copy the public lead form or add a person even when that is not the main ask. Leads & customers still has the form and Add a person. Do not email anyone.
- **Keep Connect payments on Next step when it is not the main ask is parked.** Next step can connect so GroovGro can read a copy of payments, or sync recent payment records, even when that is not the main ask. Bookings still has Connect Stripe and Sync. Do not charge a card or change checkout.
- **Keep Save your brand on Next step when it is not the main ask is parked.** Next step can save the brand even when that is not the main ask. Brand still has that form. Do not start marketing, send email, or edit the live website.
- **Keep Save how this business works on Next step when it is not the main ask is parked.** Next step can save how this business works even when that is not the main ask. Business still has that form. Do not start marketing, send email, or edit the live website.
- **Keep Add an offer on Next step when it is not the main ask is parked.** Next step can add an offer even when that is not the main ask. Offers still has that form. Do not start marketing.
- **Keep Save your brand voice on Next step when it is not the main ask is parked.** Next step can save the brand voice even when that is not the main ask. Brand voice still has that form. Do not send email, post to social, or edit the live website.
- **Keep Add a brand voice example on Next step when it is not the main ask is parked.** Next step can add a brand voice example even when that is not the main ask. Brand voice still has that form. Do not send email, post to social, or edit the live website.
- **Keep Draft copy in your voice on Next step when it is not the main ask is parked.** Next step can draft copy in the saved voice even when that is not the main ask. Brand voice still has that form. Do not send email, post to social, or edit the live website.
- **Keep Choose when you look at growth on Next step when it is not the main ask is parked.** Next step can save when to look at this week's numbers even when that is not the main ask. Growth review still has that form. Do not change the business then.
- **Keep Run an SEO check on Next step when it is not the main ask is parked.** Next step can run a homepage SEO check even when that is not the main ask. SEO still has that check. Do not edit the website.
- **Keep SEO drafts on Next step when they are not the main ask is parked.** Next step can draft and approve homepage SEO copy even when that is not the main ask. SEO still has those checks. Do not change the connected website or start ads.
- **Keep Search Console on Next step when it is not the main ask is parked.** Next step can connect Search Console, choose the property, or refresh numbers even when that is not the main ask. SEO still has that panel. Do not edit the website, submit a sitemap, or buy ads.
- **Keep Add a calendar item on Next step when it is not the main ask is parked.** Next step can review upcoming items and add a calendar item even when that is not the main ask. Events still has that form. Do not change ads or the website.
- **Match charges to people on Bookings is parked.** Bookings can match a payment copy to a person when checkout did not include an email. Intelligence still names Bookings for that loop. Do not charge a card or change checkout.
- **Name a campaign on a shared Marketing link is parked.** Marketing can type where the owner will share and a name for this share, then copy the public lead form link. Intelligence still names Marketing for that loop. Do not buy ads, send email, or change the live website.
- **Store the named place on public-form leads is parked.** Public-form leads from a named link store the place as the source so Marketing can show that channel. Do not buy ads.
- **Show the share name on Marketing (this slice).** Marketing shows the share name next to the source so two named links from the same place stay separate. Do not buy ads.
- **Show the share name on Leads and Next step.** Next step follow-up and Leads show the share name next to the place. Do not email anyone or buy ads.
- **Name a campaign on a website link (this slice).** Marketing can name a share of the existing website the same way as the public form. Do not buy ads or change the live website.
- **Show the share name on Dashboard recent leads.** Dashboard recent leads show the share name next to the place. Do not email anyone or buy ads.
- **Point Analytics at Marketing for share names.** Analytics names Marketing for the share name instead of saying campaign detail expands later. Do not buy ads.
- **Show the share name on Customers.** Customers show the share name from the first lead next to the source. Do not email anyone or buy ads.
- **Show the share name in Intelligence.** Intelligence names the share next to the place for the top lead and revenue source. Do not buy ads.
- **Point Next step at Marketing for named shares.** Next step and Leads name Marketing for naming a share. The copyable named-link fields stay on Marketing. Do not buy ads.
- **Refresh Marketing when a named share lands a person.** Marketing refreshes when a person is added, converted, or matched to a payment copy. Do not buy ads or change checkout.
- **Refresh Marketing when a named website share records a visit.** Marketing refreshes the first time that named share records a visit. Do not buy ads or change the live site.
- **Point Dashboard at Marketing for share names.** Dashboard names Marketing for the share name instead of only listing the place. Do not buy ads.
- **Show which named share moved a Goal.** Goals, Next step, Dashboard, Check what changed, Your work, drafted plans, specialists, the path so far, and Intelligence name the share that moved a connected Goal number. Do not buy ads.
- **Name the share next to a Goal that is updated by hand is parked.** A Goal the owner types by hand still names the share that brought people, bookings, or payments in. The typed number is unchanged. Do not buy ads.
- **Count a Traffic Goal from website visits is parked.** A Traffic Goal counts website visits and names the share that moved that number. Do not buy ads or change the live site.
- **Name website visits next to a Goal that is updated by hand (this slice).** A Goal the owner types by hand names website visits in the same window, along with people, bookings, and payments. The typed number is unchanged. Do not buy ads or change the live site.

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

- Specialist execute path
- Risk guardrail engine beyond stored fields and permissions
- Richer `growth_actions` fields (evidence, confidence, impact) — **IMPLEMENTED** Phase B for title / evidence / confidence / expected impact / priority. Do not add a second opportunity table.
- Keyword groups, CMS write, and GEO measurement — **PLANNED** (see Expansion)

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
  │    └─ Growth Actions (proposed only; preferred shared recommendation object)
  ├─ Planned later on the same actions table: evidence, confidence, impact, effort
  ├─ Planned new tables only when needed: keywords, content items, AI visibility scans
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
50. **Next step does not also send the owner to the module page** — no second Open Website or Open SEO button when the work is already here. Done.
51. **The path so far, specialists, and Intelligence name Next step** — missing Goal or plan, and the work beat, open Next step. Done.
52. **Growth review can change the schedule here** — save the day and time on Growth review instead of sending the owner to Goals. Done.
53. **Your work filled button is Next step** — Open Next step is the filled button; Open the approved plan stays outline so the owner can read it. Done.
54. **What changed and next-Goal copy name Next step** — read the history and review a drafted next Goal on Next step; SEO Connect website opens Next step. Done.
55. **Dashboard Connect website opens Next step** — the outline Connect website button opens Next step. Done.
56. **Owner module pages offer Next step** — Website, Leads, Bookings, SEO, Brand voice, Business, Events, and Offers have Open Next step. Done.
57. **Remaining owner pages offer Next step** — Growth review, Intelligence, Decisions, Settings, Brand, Team, Media, Integrations, Marketing, Analytics, Notifications, and Audit have Open Next step. Done.
58. **Confirm drafts, review site, owner work, and wait stay on Next step** — those coordinator loops name Next step; Intelligence website and Stripe connect observations open Next step. Done.
59. **Your work Open the page stays on Next step** — approved specialist, SEO, website, and brand-voice work open Next step. Done.
60. **Next step is first after Dashboard in the nav** — Next step sits under Dashboard; Offers, Website, Leads, and Bookings stay below it. Done.
61. **Intelligence people observations open Next step when that is the loop** — open leads or no person captured yet open Next step. Done.
62. **Phone header offers Next step** — phones show Next step next to Menu. Done.
63. **Saving a specialist recommendation refreshes Next step** — Next step and Your work refresh after save. Done.
64. **A public lead form submission refreshes Next step** — Next step and Leads refresh after a public form submission. Done.
65. **A first recorded website visit refreshes Next step** — Next step refreshes after the snippet records its first visit. Done.
66. **A new Stripe payment copy refreshes Next step** — Next step refreshes after GroovGro stores a new payment row. Done. GroovGro does not charge a card or change checkout.
67. **Read Goal and Intelligence wait stay on Next step** — Read the Goal number stays on Next step; Intelligence wait opens Next step. Done.
68. **Add a Goal and Dashboard empty lists stay on Next step** — Add a Goal stays on Next step; empty lead and calendar lists on the Dashboard name Next step. Done.
69. **Unread website status alerts open Next step** — the unread-website alert has Open Next step. Done.
70. **Website review copy opens Next step** — after saving a website address, Website names Next step instead of Business. Done.
71. **Empty Goal copy stays on Next step** — Dashboard and the path so far name Next step when there is no Goal yet, or when a plan still needs drafting. Done.
72. **Growth review copy names Next step** — confirm drafts, add a Goal, and a reached Goal name Next step. Done.
73. **Growth Plan and far-behind review name Next step** — connecting the website from a plan, and a far-behind Goal, name Next step. Done.
74. **Next step does not send the owner to Your work** — Next step does not send the owner to Your work. Done.
75. **Next step shows the Growth Plan write-up** — Next step shows the current Growth Plan; the path so far opens Next step to read an approved plan; Your work no longer sends the owner to Goals to read it. Done.
76. **Next step shows the Goal number** — Next step shows the current Goal; the path so far opens Next step to read it. Done.
77. **Next step footer and Dashboard wait stay on Next step** — Next step does not send the owner to Goals from the footer; Dashboard wait names Next step. Done.
78. **Goal and plan loops stay on Next step** — activate, draft, approve, propose, waiting actions, and a reached Goal name Next step. Done.
79. **Next step shows this week’s look** — Next step shows this week’s look; it does not send the owner to Growth review from the footer. Done.
80. **Business Active goals and Goals weekly copy stay on Next step** — Business Active goals opens Next step; Goals schedule copy names Next step for this week’s look. Done.
81. **Decisions copy names Next step for this week’s look** — Decisions names Next step to save this week’s look; Growth review stays for the monthly write-up. Done.
82. **Next step shows specialist reports** — Next step shows specialist reports and Save to Decision History. Done.
83. **Next step shows Decision History** — Next step shows recent Decision History. Done.
84. **Next step shows The path so far** — Next step shows The path so far. Done.
85. **Goals, Growth review, and Your work stay on Next step for that content** — Goals keeps Open Next step and Open growth review for the monthly write-up. Done.
86. **Dashboard and Intelligence name Next step for specialists** — Dashboard Intelligence is Intelligence; Intelligence names Next step for specialists. Done.
87. **Save this week’s look from Next step** — Next step can save this week’s look to Decision History. Done.
88. **Keep the weekly write-up on Next step** — Next step shows the full weekly write-up; Growth review is the monthly look. Done.
89. **Keep specialists on Next step** — Next step shows specialists and Save to Decision History; Intelligence is the briefing from connected data. Done.
90. **Keep The path so far on Next step** — Next step shows The path so far; Dashboard and Decisions name Next step for that story. Done.
91. **Keep proposed-action approval on Next step** — Next step can approve or reject proposed actions; Decisions lists them and names Next step. Done.
92. **Keep Your work approval on Next step** — Next step can approve or reject proposed actions; Your work lists waiting actions and names Next step. Done.
93. **Keep Goals approval on Next step** — Next step can approve or reject proposed actions; Goals lists them and names Next step. Done.
94. **Keep Goals owner work on Next step** — Next step and Your work can mark approved work done; Goals lists it and names Next step. Done.
95. **Keep Goals confirm drafts on Next step** — Next step can confirm or reject suggested goals; Goals lists them and names Next step. Done.
96. **Keep Offers confirm drafts on Next step** — Next step can confirm or reject suggested offers; Offers lists them and names Next step. Done.
97. **Keep Business confirm drafts on Next step** — Next step can confirm or reject suggested offers and goals; Business lists them and names Next step. Done.
98. **Keep dedicated Next step buttons from creating duplicate actions** — I’ll do this on dedicated loops does not also save a duplicate proposed action. Done.
99. **Keep find-pages on Next step** — Next step and Website can find pages; Business keeps Review connected data and names Next step. Done.
100. **Keep the review schedule on Next step** — Next step can save when you look at this week’s numbers; Growth review can change that day later; Goals names Next step. Done.
101. **Keep Website find-pages on Next step** — Next step can find pages; Website keeps the address and snippet, and names Next step. Done.
102. **Keep Review connected data on Next step** — Next step can find pages, check the important ones, then review; Business keeps Review connected data to run it again; Dashboard, Goals, and Offers name Next step. Done.
103. **Keep plan approve and propose on Next step** — Next step can approve or reject a draft plan, and propose the first actions; Goals lists plans and names Next step. Done.
104. **Keep Activate Goal and Draft next Goal on Next step** — Next step can make a draft the active Goal, and draft the next Goal when one is reached; Goals lists those goals and names Next step. Done.
105. **Keep Draft a plan on Next step** — Next step can draft a plan for the active Goal; Goals lists goals and names Next step. Done.
106. **Keep Goal history on Next step** — Next step shows the saved Goal numbers with the current Goal; Goals still lists the full history and the Current box. Done.
107. **Keep website review click-by-click on Next step** — setup click-by-click finds pages and reviews on Next step; Business still has Review to run it again. Done.
108. **Keep saving today's Goal number on Next step** — Next step can save today's Goal number with the current Goal after the first save; Goals still has that button and the Current box. Done.
109. **Keep Check what changed on Next step when it is not the main ask** — Next step can check what changed even when that is not the main ask; Your work still has that button. Done.
110. **Keep I did this on Next step when it is not the main ask** — Next step can mark approved work done even when that is not the main ask; Your work still has those buttons. Done.
111. **Keep website review on Next step when it is not the main ask** — Next step can find pages, check the important ones, then review even when that is not the main ask; Business still has Review to run it again. Done.
112. **Keep Activate Goal on Next step when it is not the main ask** — Next step can make a draft the active Goal even when that is not the main ask; Goals lists that draft and names Next step. Done.
113. **Keep Draft a plan on Next step when it is not the main ask** — Next step can draft a plan for the active Goal even when that is not the main ask; Goals lists goals and names Next step. Write a plan yourself still stays on Goals. Done.
114. **Keep Approve a plan on Next step when it is not the main ask** — Next step can approve or reject a draft plan even when that is not the main ask; Goals lists draft plans and names Next step. Done.
115. **Keep Propose first actions on Next step when it is not the main ask** — Next step can propose the first actions even when that is not the main ask; Goals lists approved plans and names Next step. Done.
116. **Keep Draft the next Goal on Next step when it is not the main ask** — Next step can draft the next Goal even when that is not the main ask; Goals lists a reached Goal and names Next step. Done.
117. **Keep Add a Goal on Next step when it is not the main ask** — Next step can add a Goal even when that is not the main ask; Goals still has Add a Goal. Done.
118. **Keep Connect website on Next step when it is not the main ask** — Next step can save the existing website address even when that is not the main ask; Website still has the address field and tracking snippet. Done.
119. **Keep tracking snippet on Next step when it is not the main ask** — Next step can copy the tracking snippet even when that is not the main ask; Website still has the snippet. Done.
120. **Keep Follow up open leads on Next step when it is not the main ask** — Next step can move or mark open leads even when that is not the main ask; Leads & customers still has Move and Mark customer. Done.
121. **Keep Share the public lead form on Next step when it is not the main ask** — Next step can copy the public lead form or add a person even when that is not the main ask; Leads & customers still has the form and Add a person. Done.
122. **Keep Connect payments on Next step when it is not the main ask** — Next step can connect so GroovGro can read a copy of payments, or sync recent payment records, even when that is not the main ask; Bookings still has Connect Stripe and Sync. Done.
123. **Keep Save your brand on Next step when it is not the main ask** — Next step can save the brand even when that is not the main ask; Brand still has that form. Done.
124. **Keep Save how this business works on Next step when it is not the main ask** — Next step can save how this business works even when that is not the main ask; Business still has that form. Done.
125. **Keep Add an offer on Next step when it is not the main ask** — Next step can add an offer even when that is not the main ask; Offers still has that form. Done.
126. **Keep Save your brand voice on Next step when it is not the main ask** — Next step can save the brand voice even when that is not the main ask; Brand voice still has that form. Done.
127. **Keep Add a brand voice example on Next step when it is not the main ask** — Next step can add a brand voice example even when that is not the main ask; Brand voice still has that form. Done.
128. **Keep Draft copy in your voice on Next step when it is not the main ask** — Next step can draft copy in the saved voice even when that is not the main ask; Brand voice still has that form. Done.
129. **Keep Choose when you look at growth on Next step when it is not the main ask** — Next step can save when to look at this week's numbers even when that is not the main ask; Growth review still has that form. Done.
130. **Keep Run an SEO check on Next step when it is not the main ask** — Next step can run a homepage SEO check even when that is not the main ask; SEO still has that check. Done.
131. **Keep SEO drafts on Next step when they are not the main ask** — Next step can draft and approve homepage SEO copy even when that is not the main ask; SEO still has those checks. Done.
132. **Keep Search Console on Next step when it is not the main ask** — Next step can connect Search Console, choose the property, or refresh numbers even when that is not the main ask; SEO still has that panel. Done.
133. **Keep Add a calendar item on Next step when it is not the main ask** — Next step can review upcoming items and add a calendar item even when that is not the main ask; Events still has that form. Done.
134. **Match charges to people on Bookings** — Bookings can match a payment copy to a person; Intelligence still names Bookings. Done. Do not charge a card or change checkout.
135. **Name a campaign on a shared Marketing link** — Marketing can type where the owner will share and a name for this share, then copy the public lead form link; Intelligence still names Marketing. Done. Do not buy ads.
136. **Store the named place on public-form leads** — Public-form leads from a named link store the place as the source so Marketing can show that channel. Done. Do not buy ads.
137. **Show the share name on Marketing** — Marketing shows the share name next to the source. Done. Do not buy ads.
138. **Show the share name on Leads and Next step** — Next step follow-up and Leads show the share name next to the place. Done. Do not email anyone or buy ads.
139. **Name a campaign on a website link** — Marketing can name a share of the existing website. Done. Do not buy ads or change the live website.
140. **Show the share name on Dashboard recent leads** — Dashboard recent leads show the share name next to the place. Done. Do not email anyone or buy ads.
141. **Point Analytics at Marketing for share names** — Analytics names Marketing for the share name. Done. Do not buy ads.
142. **Show the share name on Customers** — Customers show the share name from the first lead. Done. Do not email anyone or buy ads.
143. **Show the share name in Intelligence** — Intelligence names the share next to the place for the top lead and revenue source. Done. Do not buy ads.
144. **Point Next step at Marketing for named shares** — Next step and Leads name Marketing for naming a share. Done. Do not buy ads.
145. **Refresh Marketing when a named share lands a person** — Marketing refreshes when a person is added, converted, or matched to a payment copy. Done. Do not buy ads or change checkout.
146. **Refresh Marketing when a named website share records a visit** — Marketing refreshes the first time that named share records a visit. Done. Do not buy ads or change the live site.
147. **Point Dashboard at Marketing for share names** — Dashboard names Marketing for the share name. Done. Do not buy ads.
148. **Show which named share moved a Goal** — Goals, Next step, Dashboard, Check what changed, Your work, drafted plans, specialists, the path so far, and Intelligence name the share that moved a connected Goal number (leads, payments, and bookings), including extra named shares. Done. Do not buy ads.
149. **Name the share next to a Goal that is updated by hand** — A Goal the owner types by hand names the share that brought people, bookings, or payments in the same window, including extra named shares. The typed number is unchanged. Done. Do not buy ads.
150. **Count a Traffic Goal from website visits** — A Traffic Goal counts website visits in the connected window and names the share that moved that number, including extra named shares. Done. Do not buy ads or change the live site.
151. **Name website visits next to a Goal that is updated by hand** — A Goal the owner types by hand names website visits in the same window, along with people, bookings, and payments, including extra named shares. The typed number is unchanged. Done. Do not buy ads or change the live site.
152. **Phase A — documentation and architecture alignment** — Fold the v2.1 vision into the brief, this file, STATUS, and agent rules. Prefer extending `growth_actions`. This slice. No expansion code. No migration.
153. **Phase B — extend `growth_actions`** — **IMPLEMENTED** this slice. Added `title`, `evidence` (JSON), `confidence`, `expected_impact`, `priority`. SEO rows write them. Next step shows the facts without parsing `description`. Priority does not reorder Next step yet. No `growth_opportunities` table.
154. **Phase C — existing Search Console + SEO findings → growth actions** — **IMPLEMENTED** first coding slice. Recommend-only `growth_actions` (`module=seo`, `seo_page_improvement` / `seo_search_opportunity`) from existing audits and Search Console snapshots. Next step and Intelligence read those rows. No migration. No paid API. No scrape. No live-site edit.
155. **Phase D — Business Brain extras** — **IMPLEMENTED** this slice. Owner can save ideal customers, pain points, known competitors, differentiators, and prohibited claims on `business_brains`. No scrape. No keyword engine. No execute.
156. **Phase E — Keyword model and history from Search Console** — **IMPLEMENTED** this slice. Stored `search_console_snapshots.top_queries` become `keywords` + `keyword_history`. SEO and Intelligence can show that history. No vendor. No execute.
157. **Phase F — Keyword opportunity scoring** — **IMPLEMENTED** this slice. Stored keyword history gets `opportunity_score`, `opportunity_label` (`none` / `watch` / `review`), and a plain-English why. Estimate only. No vendor volume. No SERP. No execute.
158. **Phase G — Competitor and SERP notes** — **IMPLEMENTED** first slice. Owner can save `serp_notes` for a competitor they already know, optionally tied to a stored query. SEO and Intelligence can show that. No scrape. No vendor. Lookup stays off.
159. **Phase H — Content gap detection** — **IMPLEMENTED** first slice. Worth-a-look stored queries are compared to `website_discovered_pages` GroovGro already read. `content_gaps` stores gap or covered. SEO and Intelligence can show a gap. No new page. No scrape.
160. **Phase I — Content briefs and planner** — **IMPLEMENTED** first slice. Owner can save `content_briefs` on the SEO planner for a stored query. No publish. No Next step.
161. **Phase J — Content generation / optimization** — **IMPLEMENTED** first slice. Owner can write a `content_drafts` workspace draft from a saved brief. No publish. No live-site edit. No Next step.
162. **Phase K — Internal linking and schema** — **IMPLEMENTED** first slice. Pages GroovGro already read can produce `internal_link_suggestions` and `page_schema_facts`. SEO and Intelligence can show those facts. No JSON-LD. No live-site edit. No Next step.
163. **Phase L — AI Visibility / GEO architecture** — **IMPLEMENTED** first slice. Owner can save `geo_notes` for what they already heard from an AI system. SEO and Intelligence can show that. Adapter stays off. No scrape. No Next step.
164. **Phase M — AI query library and provider adapters** — **IMPLEMENTED** first slice. Owner can save `geo_queries`. `requestGeoLookup` exists and stays off. SEO and Intelligence can show the library. No scrape. No Next step.
165. **Phase N — AI visibility measurement and history** — **IMPLEMENTED** first slice. Owner can save append-only `geo_history` snapshots from a saved library question. SEO and Intelligence can show that. Adapter stays off. No scrape. No share of voice. No Next step.
166. **Phase O — GEO audits and citation gaps** — **IMPLEMENTED** first slice. Latest saved `geo_history` snapshots can produce `geo_audits` citation-gap estimates. SEO and Intelligence can show those. Adapter stays off. No scrape. No share of voice. No Next step.
167. **Phase P — CMS publishing adapters** — **IMPLEMENTED** first slice. Owner can save `cms_publish_requests` from a workspace draft. `requestCmsPublish` exists and stays off. SEO and Intelligence can show the queue. No live-site write. No Next step. Builder stays paused.
168. **Phase Q — Cross-channel opportunity scoring** — **IMPLEMENTED** this slice. Stored people, page, content, and AI-visibility counts get `none` / `watch` / `review` estimates on `channel_scores`. Intelligence and Next step can show that comparison. The estimate does not reorder Next step. No ads. No execute.
169. **Phase R — Attribution improvements** — **IMPLEMENTED** this slice. Stored people-to-revenue joins get DIRECT / ASSISTED / ESTIMATED / UNKNOWN labels. Marketing and Intelligence can show those. Matching charges stays on Bookings. No keyword path. No AI referral. No ads. No execute.
170. **Phase S — Experimentation / before-and-after** — **IMPLEMENTED** this slice. The first and latest stored Goal numbers become `before_after_looks` (`improved` / `same` / `declined`). Intelligence and Next step can show that look. It is not an experiment GroovGro ran and does not change Next step order, buy ads, or change the plan.
171. **Phase T — Carefully expanded execution** — **IMPLEMENTED** this slice. Owner can save approved work to `execution_requests`. `requestExecute` exists and stays off. Intelligence, Next step, and Your work can show that queue. It does not run the work, reorder Next step, buy ads, send email, or turn on Growth Director. Do not turn on SERP lookup, GEO lookup, or CMS publish. Do not use channel scores or a before-and-after to reorder Next step until Jason asks.
172. **Competitor looks from owner-named URLs** — **IMPLEMENTED** this slice. Owner can save `competitor_sites` from a public website they already know. GroovGro may fetch that page and store a model guess, marketing guess, and compete note. If the host blocks GroovGro’s server, GroovGro may read the same owner-named URL through a public page reader, or the owner can paste the page. SEO and Intelligence can show that. `requestCompetitorSearch` exists and stays off. Do not scrape Google. Do not copy their words onto a live site. Do not buy ads or change checkout. Do not add a Next step loop.
173. **Deeper competitor looks from the same named site** — **IMPLEMENTED** this slice. GroovGro reads the homepage plus a few same-origin public pages, then writes how they sell, how they market, and how we might compete. Search discovery stays off. Do not scrape Google. Do not copy their words onto a live site. Do not add a Next step loop.
174. **Owner-run competitor search from stored terms** — **IMPLEMENTED** this slice. SEO shows the best stored search terms. The owner opens that search and can save a website they found (`source=owner_search`). `requestCompetitorSearch` stays off. GroovGro does not scrape Google or invent competitors. Do not add a Next step loop.
175. **Compare saved competitor looks to this business** — **IMPLEMENTED** this slice. SEO compares looked competitor websites to saved offers or differences and writes how those sites stack up. Intelligence can show that. Search discovery stays off. Do not scrape Google. Do not copy their words onto a live site. Do not add a Next step loop.
176. **Competitor page topics missing from pages already read** — **IMPLEMENTED** this slice. SEO names topics looked competitor sites show that GroovGro has not read on this business’s own pages. Intelligence can show that. GroovGro does not invent topics, create a page, scrape Google, or add a Next step loop.
177. **Content brief from a competitor page-topic gap** — **IMPLEMENTED** this slice. Owner can save a planner brief from a competitor page topic GroovGro has not read on this business’s pages. Workspace drafts stay available. GroovGro does not publish, copy their words, scrape Google, or add a Next step loop.
178. **Workspace draft from a competitor-gap brief uses this business’s words** — **IMPLEMENTED** this slice. A workspace draft from a competitor-topic brief leads with saved offers or differences. GroovGro does not copy competitor words, publish, scrape Google, or add a Next step loop.
179. **Check a competitor-topic workspace draft against saved offers** — **IMPLEMENTED** this slice. SEO checks whether a competitor-topic workspace draft names a saved offer. Intelligence can show that. GroovGro does not rewrite the live site, publish, scrape Google, or add a Next step loop.
180. **Save a planner workspace draft for later CMS review** — **IMPLEMENTED** this slice. Owner can save a Content planner workspace draft, including a competitor-topic draft, for later review without leaving that draft. `requestCmsPublish` stays off. GroovGro does not publish, scrape Google, or add a Next step loop.
181. **Owner-saved compete move** — **IMPLEMENTED** this slice. Owner can save what they will do after looking at a competitor site. SEO and Intelligence can show that. GroovGro does not do the work, publish, scrape Google, or add a Next step loop.
182. **Compete move from a competitor page-topic gap** — **IMPLEMENTED** this slice. Owner can save “I will cover this” from a competitor page topic GroovGro has not read on this business’s pages. GroovGro does not do the work, create the page, publish, scrape Google, or add a Next step loop.
183. **Check a competitor-topic workspace draft against what makes this business different** — **IMPLEMENTED** this slice. SEO checks whether a competitor-topic workspace draft names a saved differentiator. Intelligence can show that. GroovGro does not rewrite the live site, publish, scrape Google, or add a Next step loop.
184. **Optional note when saving a planner draft for later CMS review** — **IMPLEMENTED** this slice. Owner can add where they already publish when they save a Content planner draft for later review. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
185. **Owner marks a compete move done** — **IMPLEMENTED** this slice. Owner can mark a saved compete move as done. GroovGro does not do the work, publish, scrape Google, or add a Next step loop.
186. **Intelligence shows compete moves marked done** — **IMPLEMENTED** this slice. Intelligence can say how many owner-saved compete moves are marked done. GroovGro does not do the work, publish, or add a Next step loop.
187. **Planner shows the later-review note on a queued draft** — **IMPLEMENTED** this slice. A Content planner draft saved for later review shows the owner note. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
188. **Compete move from a stored compare** — **IMPLEMENTED** this slice. Owner can save a compete move from how saved competitor sites compare to this business. GroovGro does not do the work, copy their words, publish, or add a Next step loop.
189. **Hide a compete-move button that is already saved** — **IMPLEMENTED** this slice. SEO hides “I will cover this” or “I will do this compare” when that exact title is already saved. GroovGro does not do the work, publish, or add a Next step loop.
190. **Intelligence shows compete moves still planned** — **IMPLEMENTED** this slice. Intelligence can say how many owner-saved compete moves are still planned. GroovGro does not do the work, publish, or add a Next step loop.
191. **Intelligence recommends marking a planned compete move done** — **IMPLEMENTED** this slice. Intelligence can recommend marking a still-planned compete move done after the owner finishes it. GroovGro does not do the work, publish, or add a Next step loop.
192. **Hide a competitor-topic brief button that is already saved** — **IMPLEMENTED** this slice. SEO hides “Save a brief for this topic” when that topic is already on the planner. GroovGro does not write the page, publish, or add a Next step loop.
193. **Hide the competitor-topic brief recommendation after one is saved** — **IMPLEMENTED** this slice. Intelligence stops recommending a competitor-topic brief once one is already on the planner. GroovGro does not write the page, publish, or add a Next step loop.
194. **SEO heading shows how many compete moves are still planned** — **IMPLEMENTED** this slice. The saved compete-move list on SEO says how many are still planned or that all are marked done. GroovGro does not do the work, publish, or add a Next step loop.
195. **Intelligence recommends reviewing a later-review draft** — **IMPLEMENTED** this slice. Intelligence can recommend reading a workspace draft already saved for later CMS review. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
196. **SEO lists planned compete moves first** — **IMPLEMENTED** this slice. The saved compete-move list on SEO shows still-planned moves before moves marked done. GroovGro does not do the work, publish, or add a Next step loop.
197. **SEO groups planned and done compete moves** — **IMPLEMENTED** this slice. When some compete moves are still planned and some are marked done, SEO labels those groups. GroovGro does not do the work, publish, or add a Next step loop.
198. **Intelligence recommends a compete move from a stored compare** — **IMPLEMENTED** this slice. When GroovGro has compared saved competitor websites and the owner has not saved a compete move, Intelligence can recommend saving one from that compare. GroovGro does not do the work, copy their words, publish, or add a Next step loop.
199. **Planner heading shows later-review count** — **IMPLEMENTED** this slice. The Content planner heading says how many workspace drafts are saved for later CMS review. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
200. **Later-review queue heading shows how many are waiting** — **IMPLEMENTED** this slice. The later-review queue heading on SEO says how many drafts are waiting. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
201. **Hide already-queued drafts from the later-review form** — **IMPLEMENTED** this slice. The later-review form on SEO hides workspace drafts already saved for later review. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
202. **Intelligence still recommends later-review when another draft is open** — **IMPLEMENTED** this slice. Intelligence keeps recommending later CMS review when a workspace draft is not in that queue yet. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
203. **Intelligence still recommends a workspace draft when another brief is open** — **IMPLEMENTED** this slice. Intelligence keeps recommending a workspace draft when a saved brief does not have one yet. GroovGro does not publish or add a Next step loop.
204. **Content-gap heading shows how many queries are missing** — **IMPLEMENTED** this slice. The missing-page query list on SEO says how many worth-a-look queries have no matching page GroovGro has read. GroovGro does not write a page, publish, or add a Next step loop.
205. **Competitor page-topic heading shows how many topics are missing** — **IMPLEMENTED** this slice. The competitor page-topic list on SEO says how many topics GroovGro has not read on this business’s pages. GroovGro does not create a page, publish, or add a Next step loop.
206. **Refuse a duplicate compete-move title** — **IMPLEMENTED** this slice. Saving what the owner will do refuses a title that is already saved. GroovGro does not do the work, publish, or add a Next step loop.
207. **Refuse a duplicate planner brief** — **IMPLEMENTED** this slice. Saving a Content planner brief refuses a topic that is already on the planner. GroovGro does not write the page, publish, or add a Next step loop.
208. **Planner query suggestions skip topics already saved** — **IMPLEMENTED** this slice. Content planner query suggestions hide topics that already have a brief. GroovGro does not write the page, publish, or add a Next step loop.
209. **Intelligence still recommends a competitor-topic brief when another topic is open** — **IMPLEMENTED** this slice. Intelligence keeps recommending a competitor-topic brief when another missing topic does not have one yet. GroovGro does not write the page, publish, or add a Next step loop.
210. **Content brief from a stored missing-page query** — **IMPLEMENTED** this slice. Owner can save a planner brief from a worth-a-look query GroovGro has not read on this business’s pages. GroovGro does not write the page, publish, or add a Next step loop.
211. **Intelligence names the missing-page list for a new brief** — **IMPLEMENTED** this slice. Intelligence can say a missing-page brief can be saved from that list or the planner. GroovGro does not write the page, publish, or add a Next step loop.
212. **SEO intro names a brief from a missing-page query** — **IMPLEMENTED** this slice. The SEO page says the owner can save a brief for a missing-page query or on the planner. GroovGro does not write the page, publish, or add a Next step loop.
213. **Intelligence names a brief from the missing-page list** — **IMPLEMENTED** this slice. Intelligence can say a missing-page query can get a planner brief from that list. GroovGro does not write the page, publish, or add a Next step loop.
214. **Planner copy names a brief from a missing-page query** — **IMPLEMENTED** this slice. The Content planner says a brief can come from a missing-page query. GroovGro does not write the page, publish, or add a Next step loop.
215. **Status text names compete-move and planner polish** — **IMPLEMENTED** this slice. Architecture and status summaries name planned/done compete moves, refused duplicates, and a brief from a missing-page query. GroovGro does not publish or add a Next step loop.
216. **Missing-page briefs keep a content-gap source** — **IMPLEMENTED** this slice. A planner brief saved from a missing-page query is stored as `content_gap`. GroovGro does not write the page, publish, or add a Next step loop.
217. **Intelligence shows briefs from a missing-page query** — **IMPLEMENTED** this slice. Intelligence can say how many planner briefs came from a missing-page query. GroovGro does not write the page, publish, or add a Next step loop.
218. **Intelligence still recommends a missing-page brief when another brief is open** — **IMPLEMENTED** this slice. Intelligence keeps recommending a missing-page brief when another missing-page query does not have one yet. GroovGro does not write the page, publish, or add a Next step loop.
219. **Content-gap heading shows how many already have a brief** — **IMPLEMENTED** this slice. The missing-page query list on SEO says how many of those queries already have a planner brief. GroovGro does not write the page, publish, or add a Next step loop.
220. **Competitor page-topic heading shows how many already have a brief** — **IMPLEMENTED** this slice. The competitor page-topic list on SEO says how many of those topics already have a planner brief. GroovGro does not write the page, publish, or add a Next step loop.
221. **Intelligence shows missing-page queries still without a brief** — **IMPLEMENTED** this slice. Intelligence can say how many missing-page queries still have no brief, or that all of those already have one. GroovGro does not write the page, publish, or add a Next step loop.
222. **Intelligence shows competitor page topics still without a brief** — **IMPLEMENTED** this slice. Intelligence can say how many competitor page topics still have no brief, or that all of those already have one. GroovGro does not write the page, publish, or add a Next step loop.
223. **Planner heading shows how many briefs are saved** — **IMPLEMENTED** this slice. The Content planner heading says how many briefs are saved, then how many drafts are saved for later review. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
224. **Planner lists briefs that still need a draft first** — **IMPLEMENTED** this slice. The Content planner shows briefs without a workspace draft before briefs that already have one. GroovGro does not publish or add a Next step loop.
225. **Planner groups briefs that still need a draft** — **IMPLEMENTED** this slice. When some briefs have a workspace draft and some do not, the planner labels those groups. GroovGro does not publish or add a Next step loop.
226. **Intelligence shows briefs that still need a workspace draft** — **IMPLEMENTED** this slice. Intelligence can say how many planner briefs still need a workspace draft, or that all of those already have one. GroovGro does not publish or add a Next step loop.
227. **Intelligence shows drafts that still need later review** — **IMPLEMENTED** this slice. Intelligence can say how many workspace drafts are still not saved for later review, or that all of those already are. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
228. **Status text names remaining brief and draft counts** — **IMPLEMENTED** this slice. Architecture and status summaries name remaining missing-page briefs, competitor-topic briefs, workspace drafts, and later-review drafts. GroovGro does not publish or add a Next step loop.
229. **Planner heading shows how many briefs still need a draft** — **IMPLEMENTED** this slice. The Content planner heading says how many saved briefs still need a workspace draft. GroovGro does not publish or add a Next step loop.
230. **Intelligence names planner briefs listed first** — **IMPLEMENTED** this slice. Intelligence can say briefs that still need a workspace draft are listed first. GroovGro does not publish or add a Next step loop.
231. **SEO lists missing-page queries that still need a brief first** — **IMPLEMENTED** this slice. The missing-page query list shows queries without a planner brief before queries that already have one. GroovGro does not write the page, publish, or add a Next step loop.
232. **SEO lists competitor page topics that still need a brief first** — **IMPLEMENTED** this slice. The competitor page-topic list shows topics without a planner brief before topics that already have one. GroovGro does not write the page, publish, or add a Next step loop.
233. **SEO groups missing-page queries that still need a brief** — **IMPLEMENTED** this slice. When some missing-page queries already have a brief and some do not, SEO labels those groups. GroovGro does not write the page, publish, or add a Next step loop.
234. **SEO groups competitor page topics that still need a brief** — **IMPLEMENTED** this slice. When some competitor page topics already have a brief and some do not, SEO labels those groups. GroovGro does not write the page, publish, or add a Next step loop.
235. **Status text names remaining brief and draft groups** — **IMPLEMENTED** this slice. Architecture and status summaries name grouped remaining work on the planner, missing-page list, and competitor page-topic list. GroovGro does not publish or add a Next step loop.
236. **Intelligence names missing-page queries listed first** — **IMPLEMENTED** this slice. Intelligence can say missing-page queries that still need a brief are listed first. GroovGro does not write the page, publish, or add a Next step loop.
237. **Intelligence names competitor page topics listed first** — **IMPLEMENTED** this slice. Intelligence can say competitor page topics that still need a brief are listed first. GroovGro does not write the page, publish, or add a Next step loop.
238. **Intelligence names the missing-page review list remaining first** — **IMPLEMENTED** this slice. Intelligence can say the missing-page review list shows queries that still need a brief first. GroovGro does not write the page, publish, or add a Next step loop.
239. **Intelligence names the competitor topic review list remaining first** — **IMPLEMENTED** this slice. Intelligence can say the competitor topic review list shows topics that still need a brief first. GroovGro does not write the page, publish, or add a Next step loop.
240. **Intelligence hides the missing-page review after those queries have briefs** — **IMPLEMENTED** this slice. Intelligence stops recommending a missing-page review after every missing-page query already has a brief. GroovGro does not write the page, publish, or add a Next step loop.
241. **Intelligence hides the competitor topic review after those topics have briefs** — **IMPLEMENTED** this slice. Intelligence stops recommending a competitor topic review after every competitor page topic already has a brief. GroovGro does not write the page, publish, or add a Next step loop.
242. **Status text names listed-first and hidden review suggestions** — **IMPLEMENTED** this slice. Architecture and status summaries name Intelligence pointing at remaining groups and hiding a review after every item already has a brief. GroovGro does not publish or add a Next step loop.
243. **SEO intro names remaining queries and topics listed first** — **IMPLEMENTED** this slice. The SEO page says queries and topics that still need a brief are listed first. GroovGro does not write the page, publish, or add a Next step loop.
244. **Planner copy names remaining briefs listed first** — **IMPLEMENTED** this slice. The Content planner says briefs that still need a workspace draft are listed first. GroovGro does not publish or add a Next step loop.
245. **Missing-page list copy names remaining queries listed first** — **IMPLEMENTED** this slice. The missing-page query list says queries that still need a brief are listed first. GroovGro does not write the page, publish, or add a Next step loop.
246. **Compete card copy names remaining topics listed first** — **IMPLEMENTED** this slice. The compete card says topics that still need a brief are listed first. GroovGro does not write the page, publish, or add a Next step loop.
247. **Status text names listed-first page copy** — **IMPLEMENTED** this slice. Architecture and status summaries name SEO, planner, missing-page, and compete-card copy that remaining work is listed first. GroovGro does not publish or add a Next step loop.
248. **Missing-page group headings show how many sit in each group** — **IMPLEMENTED** this slice. When some missing-page queries already have a brief and some do not, those group headings include a count. GroovGro does not write the page, publish, or add a Next step loop.
249. **Competitor page-topic group headings show how many sit in each group** — **IMPLEMENTED** this slice. When some competitor page topics already have a brief and some do not, those group headings include a count. GroovGro does not write the page, publish, or add a Next step loop.
250. **Planner group headings show how many sit in each group** — **IMPLEMENTED** this slice. When some planner briefs have a workspace draft and some do not, those group headings include a count. GroovGro does not publish or add a Next step loop.
251. **Status text names group heading counts** — **IMPLEMENTED** this slice. Architecture and status summaries name counted remaining-work groups on the planner, missing-page list, and competitor page-topic list. GroovGro does not publish or add a Next step loop.
252. **Compete-move group headings show how many sit in each group** — **IMPLEMENTED** this slice. When some compete moves are still planned and some are marked done, those group headings include a count. GroovGro does not do the work, publish, or add a Next step loop.
253. **Status text names compete-move group heading counts** — **IMPLEMENTED** this slice. Architecture and status summaries name counted planned and done compete-move groups. GroovGro does not publish or add a Next step loop.
254. **Intelligence names planned compete moves listed first** — **IMPLEMENTED** this slice. Intelligence can say planned compete moves are listed first. GroovGro does not do the work, publish, or add a Next step loop.
255. **Compete card copy names planned moves listed first** — **IMPLEMENTED** this slice. The compete card says still-planned moves are listed first. GroovGro does not do the work, publish, or add a Next step loop.
256. **Status text names planned compete moves listed first** — **IMPLEMENTED** this slice. Architecture and status summaries name Intelligence and compete-card copy that planned moves are listed first. GroovGro does not publish or add a Next step loop.
257. **Later-review heading shows remaining drafts** — **IMPLEMENTED** this slice. The later-review queue heading says how many workspace drafts still need later review. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
258. **Later-review copy names remaining drafts listed first** — **IMPLEMENTED** this slice. The later-review queue says drafts that still need later review are listed first. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
259. **Intelligence names remaining later-review drafts listed first** — **IMPLEMENTED** this slice. Intelligence can say remaining workspace drafts that still need later review are listed first. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
260. **Status text names remaining later-review drafts** — **IMPLEMENTED** this slice. Architecture and status summaries name the later-review heading, page copy, and Intelligence that remaining drafts are listed first. GroovGro does not publish or add a Next step loop.
261. **SEO intro names remaining later-review drafts listed first** — **IMPLEMENTED** this slice. The SEO page says drafts that still need later review are listed first. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
262. **Planner heading shows remaining later-review drafts** — **IMPLEMENTED** this slice. The Content planner heading says how many workspace drafts still need later review. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
263. **Planner copy names remaining later-review drafts listed first** — **IMPLEMENTED** this slice. The Content planner says drafts that still need later review are listed first. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
264. **Intelligence names Later review for waiting drafts** — **IMPLEMENTED** this slice. Intelligence can say waiting later-review drafts are listed on Later review. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
265. **Status text names remaining later-review planner and SEO copy** — **IMPLEMENTED** this slice. Architecture and status summaries name the SEO intro, planner heading, planner copy, and Intelligence Later review note. GroovGro does not publish or add a Next step loop.
266. **Empty later-review queue names remaining drafts** — **IMPLEMENTED** this slice. When no drafts are saved for later review yet, the Later review panel names remaining workspace drafts and says they are listed first in the form. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
267. **Intelligence names how many drafts still need later review** — **IMPLEMENTED** this slice. Intelligence can say how many workspace drafts still need later review. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
268. **Intelligence names how many drafts are waiting on Later review** — **IMPLEMENTED** this slice. Intelligence can say how many drafts are waiting on Later review. `requestCmsPublish` stays off. GroovGro does not publish or add a Next step loop.
269. **Status text names remaining later-review counts** — **IMPLEMENTED** this slice. Architecture and status summaries name the empty-queue remaining copy and Intelligence remaining and waiting counts. GroovGro does not publish or add a Next step loop.
270. **Citation-gaps heading shows how many gaps sit there** — **IMPLEMENTED** this slice. The citation-gaps heading on SEO says how many gaps GroovGro estimated from saved history. GroovGro does not ask an AI system or add a Next step loop.
271. **Links-and-schema heading shows suggested-link and schema-fact counts** — **IMPLEMENTED** this slice. The links-and-schema heading on SEO says how many suggested links and schema facts sit there. GroovGro does not add links or schema to the live website or add a Next step loop.
272. **Links-and-schema group headings show counts** — **IMPLEMENTED** this slice. Suggested links and Estimated schema types group headings include a count. GroovGro does not add links or schema to the live website or add a Next step loop.
273. **Intelligence names how many citation gaps are listed** — **IMPLEMENTED** this slice. Intelligence can say how many citation gaps are listed on SEO. GroovGro does not ask an AI system or add a Next step loop.
274. **Intelligence names how many link and schema facts are listed** — **IMPLEMENTED** this slice. Intelligence can say how many suggested links and schema facts are listed on SEO. GroovGro does not add links or schema to the live website or add a Next step loop.
275. **Status text names citation and page-structure counts** — **IMPLEMENTED** this slice. Architecture and status summaries name citation-gap and links-and-schema heading, group, and Intelligence counts. GroovGro does not publish or add a Next step loop.
276. **AI-visibility notes heading shows how many notes sit there** — **IMPLEMENTED** this slice. The AI-visibility notes heading on SEO says how many notes are saved. GroovGro does not ask an AI system or add a Next step loop.
277. **Library-questions heading shows how many questions sit there** — **IMPLEMENTED** this slice. The library-questions heading on SEO says how many questions are saved. GroovGro does not ask an AI system or add a Next step loop.
278. **Visibility-history heading shows how many snapshots sit there** — **IMPLEMENTED** this slice. The visibility-history heading on SEO says how many snapshots are saved. GroovGro does not ask an AI system or add a Next step loop.
279. **Visibility-history heading shows remaining questions without a snapshot** — **IMPLEMENTED** this slice. The visibility-history heading says how many library questions still need a snapshot. GroovGro does not ask an AI system or add a Next step loop.
280. **Visibility-history form lists remaining questions first** — **IMPLEMENTED** this slice. The visibility-history form lists library questions that still need a snapshot first. GroovGro does not ask an AI system or add a Next step loop.
281. **Intelligence names remaining library questions listed first** — **IMPLEMENTED** this slice. Intelligence can say library questions that still need a snapshot are listed first. GroovGro does not ask an AI system or add a Next step loop.
282. **Status text names AI-visibility heading and remaining snapshot counts** — **IMPLEMENTED** this slice. Architecture and status summaries name AI-visibility note, library-question, and visibility-history heading counts, remaining questions, and listed-first copy. GroovGro does not publish or add a Next step loop.
283. **Recorded-queries heading shows how many queries sit there** — **IMPLEMENTED** this slice. The recorded-queries heading on SEO says how many Search Console queries GroovGro has stored. GroovGro does not buy keyword data or add a Next step loop.
284. **Competitor-notes heading shows how many notes sit there** — **IMPLEMENTED** this slice. The competitor-notes heading on SEO says how many owner-saved notes sit there. GroovGro does not scrape search results or add a Next step loop.
285. **Channel-compare heading shows how many compares sit there** — **IMPLEMENTED** this slice. The stored-evidence compare heading on SEO says how many channel compares GroovGro estimated. GroovGro does not change Next step or add a Next step loop.
286. **Before-and-after heading shows how many looks sit there** — **IMPLEMENTED** this slice. The before-and-after heading on SEO says how many stored Goal looks sit there. GroovGro does not change the plan or add a Next step loop.
287. **Status text names recorded-query, competitor-note, channel, and before-after heading counts** — **IMPLEMENTED** this slice. Architecture and status summaries name those SEO heading counts. GroovGro does not publish or add a Next step loop.
288. **Intelligence names how many worth-a-look queries are listed** — **IMPLEMENTED** this slice. Intelligence can say how many stored Search Console queries marked worth a look are listed on SEO. GroovGro does not buy keyword data or add a Next step loop.
289. **Intelligence names how many stored channel compares are listed** — **IMPLEMENTED** this slice. Intelligence can say how many stored channel compares are listed. GroovGro does not change Next step or add a Next step loop.
290. **Intelligence names how many stored before-and-after looks are listed** — **IMPLEMENTED** this slice. Intelligence can say how many stored before-and-after looks are listed. GroovGro does not change the plan or add a Next step loop.
291. **Status text names Intelligence listed counts for queries, channels, and before-and-after looks** — **IMPLEMENTED** this slice. Architecture and status summaries name those Intelligence listed counts. GroovGro does not publish or add a Next step loop.
292. **Later-run heading shows remaining approved work** — **IMPLEMENTED** this slice. The later-run queue heading says how many approved work items still need a later-run save. `requestExecute` stays off. GroovGro does not run work or add a Next step loop.
293. **Hide later-run items that are already saved** — **IMPLEMENTED** this slice. The later-run form hides approved work already saved for later. `requestExecute` stays off. GroovGro does not run work or add a Next step loop.
294. **Later-run copy names remaining work listed first** — **IMPLEMENTED** this slice. The later-run queue says remaining approved work that still needs a later-run save is listed first. `requestExecute` stays off. GroovGro does not run work or add a Next step loop.
295. **Intelligence names how many later-run items are waiting** — **IMPLEMENTED** this slice. Intelligence can say how many later-run items are waiting. `requestExecute` stays off. GroovGro does not run work or add a Next step loop.
296. **Status text names later-run remaining counts** — **IMPLEMENTED** this slice. Architecture and status summaries name the later-run heading, hidden queued items, listed-first copy, and Intelligence waiting count. GroovGro does not publish or add a Next step loop.
297. **Empty later-run queue names remaining approved work** — **IMPLEMENTED** this slice. When no later-run items are saved yet, the queue names remaining approved work and says it is listed first in the form. `requestExecute` stays off. GroovGro does not run work or add a Next step loop.
298. **Intelligence names remaining later-run work listed first** — **IMPLEMENTED** this slice. Intelligence can say remaining approved work that still needs a later-run save is listed first. `requestExecute` stays off. GroovGro does not run work or add a Next step loop.
299. **Compete card heading shows saved sites and planned moves** — **IMPLEMENTED** this slice. The How we might compete heading on SEO says how many competitor sites are saved and how many compete moves are still planned. GroovGro does not scrape Google or add a Next step loop.
300. **Status text names the compete card heading counts** — **IMPLEMENTED** this slice. Architecture and status summaries name the How we might compete heading counts for saved sites and planned moves. GroovGro does not publish or add a Next step loop.
301. **Intelligence names How we might compete for saved sites** — **IMPLEMENTED** this slice. Intelligence can say saved competitor sites are listed on How we might compete. GroovGro does not scrape Google or add a Next step loop.
302. **SEO intro names How we might compete heading counts** — **IMPLEMENTED** this slice. The SEO page says How we might compete names saved sites and planned moves. GroovGro does not scrape Google or add a Next step loop.
303. **Recorded-queries heading shows how many are worth a look** — **IMPLEMENTED** this slice. The recorded-queries heading on SEO says how many stored Search Console queries are worth a look. GroovGro does not buy keyword data or add a Next step loop.
304. **Recorded-queries list shows worth-a-look queries first** — **IMPLEMENTED** this slice. The recorded-queries list on SEO shows worth-a-look queries first. GroovGro does not buy keyword data or add a Next step loop.
305. **Intelligence names worth-a-look queries listed first** — **IMPLEMENTED** this slice. Intelligence can say recorded queries that are worth a look are listed first. GroovGro does not buy keyword data or add a Next step loop.
306. **Status text names worth-a-look query heading and listed-first copy** — **IMPLEMENTED** this slice. Architecture and status summaries name the recorded-queries heading, list order, and Intelligence copy for worth-a-look queries. GroovGro does not publish or add a Next step loop.

V1 website builder, SEO, Brand Voice, and Stripe stay available throughout.

## Expansion: SEO Intelligence, Content, AI Visibility (10 September 2026)

Canonical product text: [MASTER_BRIEF.md](../MASTER_BRIEF.md) v2.2 §§15–19. This section is the implementation map. Do not treat **PLANNED** lists as shipped.

### Shared recommendation: extend `growth_actions`

Inspected table (`src/lib/db/schema.ts` → `growthActions`):

| Already on the row | Role today |
| --- | --- |
| `organization_id` | Tenant isolation |
| `goal_id`, `plan_id` | Optional Goal / plan link |
| `module`, `action_type` | Source and kind (`seo`, `crm`, `follow_up_leads`, …) |
| `description` | Plain-English recommendation |
| `status`, `risk` | `proposed` / approved / owner-completed; operational vs optimization |
| `proposed_at`, `approved_at`, `executed_at` | Review and later execute (execute unused) |
| `provider`, `external_id`, `result`, `error` | Adapter hook and outcome text |

**Preference:** keep one table. Do not add `growth_opportunities`.

**Phase C:** insert recommend-only rows. Used: `module=seo`, `action_type=seo_page_improvement` or `seo_search_opportunity`, `description` = what + why + recommend, `status=proposed`, `provider` = `seo_audit` or `search_console`, `external_id` = stable fingerprint for dedup.

**Phase B (this slice):** same table now also has `title`, `evidence` (JSON), `confidence`, `expected_impact`, `priority`. New SEO rows fill them. Older rows can be backfilled when title is still empty. Do not parse `description`.

Fields still later if usage needs them: `effort`, `estimated_cost`, `urgency`, `reviewed_at`, measurement window, `learning`. Only then consider a second table, and only if this model cannot stay coherent.

### IMPLEMENTED / PARTIAL / PLANNED

**IMPLEMENTED:** page SEO checks; SEO drafts; Search Console read-only snapshots; Brand Voice in-workspace drafts; named-share attribution; Next step recommend-only; existing SEO/Search Console evidence → recommend-only Growth Actions; structured title/evidence/confidence/impact on `growth_actions`; owner-entered Business Brain extras for later search/content work; keyword model and history from stored Search Console queries; conservative keyword estimate ranks from those stored numbers; owner-entered competitor notes; owner-named competitor website looks with a deeper same-site read, owner-run suggested searches, a compare of those stored looks to what this business sells, and competitor page-topic gaps vs pages already read, with search discovery off; owner-saved compete moves, including from a compare or page topic, with planned/done grouping and duplicate titles refused; content gaps from stored worth-a-look queries vs pages already read, with a brief from that list; owner-entered content briefs on the SEO planner, with duplicate topics refused; workspace drafts from a saved brief; checks of competitor-topic drafts against saved offers and what makes the business different; later-review from the Content planner, with queued counts; internal link suggestions and schema type estimates from pages already read; owner-entered AI visibility notes; owner-entered AI query library with lookup off; owner-entered AI visibility history snapshots; citation-gap estimates from those snapshots; owner-entered CMS publish review queue with write off; conservative cross-channel estimates from stored people, page, content, and AI-visibility facts; DIRECT / ASSISTED / ESTIMATED / UNKNOWN labels on stored people-to-revenue joins; first-vs-latest stored Goal before-and-after looks; owner-entered later-run queue from approved work with execute off.

**PARTIALLY IMPLEMENTED:** Business Brain; share-level attribution (joins are labeled; keyword → page → person and AI-referral are not); fixed Next step priority (channel estimates are shown and do not reorder it); paused builder; keywords (history and estimate rank stored; groups, intent, and vendor scores not); competitor/SERP (owner notes, owner-named website looks, owner-run searches, and stored-look compares stored; automated search discovery, lookup, and vendors not); content (gaps, briefs from the planner or a missing-page query, workspace drafts, offer checks on competitor-topic drafts, later-review from the planner, review queue, and page-structure facts stored; live publish not); AI Visibility / GEO (owner notes, query library, history snapshots, and citation-gap estimates stored; live adapters and share of voice not); experimentation (first vs latest stored Goal numbers; A/B and using that look to change the plan not); execution (later-run queue stored; adapter, ads, email, social, and Growth Director stay off).

**PLANNED:** live CMS write; finding more competitors from the best search terms for the business type (allowed adapter only); SERP/competitor lookup engines; using channel scores to reorder Next step; keyword → page and AI-referral attribution; using a before-and-after to change the plan; turning on execute, Growth Director, and guarded automation.

### Architecture rules

- Next step is the owner review surface.
- Vendors stay behind adapters. Search Console already exists (read-only). GEO lookup (`geoLookupEnabled`) stays off.
- GEO facts in this slice are owner-entered `geo_notes`, `geo_queries`, and `geo_history`, plus `geo_audits` estimates from that history. `requestGeoLookup` stays off. Do not hard-code a vendor list. Do not scrape AI answers. Do not treat one AI answer as truth.
- Every new table keeps `organization_id`.
- Review-first publishing. `requestCmsPublish` stays off. No scrape. No paid vendor in Phase C.
- Do not overwrite Ocean Sailing Adventures or change stripe-osa.
- Do not start ads, email send, social post, Growth Director autopilot, or the hosted builder in this expansion.
