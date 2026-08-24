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

**Current functionality:** Next step priority is (1) confirm drafts, (2) do approved work on Your work, (3) make a drafted next Goal active, (4) use the latest what-changed outcome, (5) specialist recommend, (6) wait. Ads, email, and social stay left alone. GroovGro does not execute.

### 14. The path so far

**Reason:** Goal, plan, work, learning, and Next step were on separate screens. The owner needs one plain-English path.

**Affected:** `src/lib/growth/story.ts`, Dashboard, Decisions. Reads existing Goals, plans, actions, decision outcomes, and Next step.

**Migration risk:** None.

**Current functionality:** Dashboard and Decisions show The path so far. Each beat links to Goals, Your work, or Next step. GroovGro does not execute, start ads, send email, charge a card, or change the live website.

### 15. Draft the next Goal after one is reached

**Reason:** A reached Goal is the end of one loop. The owner needs a reviewable next Goal. GroovGro must not invent industry targets or activate marketing.

**Affected:** `src/lib/growth/next-goal.ts`, `src/lib/actions/next-goal.ts`, Goals, Next step. Reuses `growth_goals`. Dedupes with `inferredFrom = reached:{goalId}`.

**Migration risk:** None.

**Current functionality:** If a Goal is achieved or the live number meets the target, the owner can draft the next Goal. The new target is the current number plus the previous target size. It is saved as a draft. GroovGro does not execute.

### 16. Make a draft Goal active (this slice)

**Reason:** After a next Goal is drafted, the owner still had to hunt a status dropdown. One button should make that draft the active Goal.

**Affected:** `src/lib/growth/next-goal.ts`, `src/lib/actions/next-goal.ts`, Goals, Next step. Reuses `growth_goals`. Does not auto-draft a plan.

**Migration risk:** None.

**Current functionality:** A reviewed draft Goal can be made active. Suggested website drafts stay on Business. If the draft came from a reached Goal, that older Goal is marked achieved. Other active Goals are paused. GroovGro does not execute.

## BUILD NEXT (after this slice is tested)

- **Website builder is parked.** Optional GroovGro-hosted pages stay. Do not add builder features until Jason asks.
- **Growth Plan is parked.** Versioned write-up from a Goal. Approve or reject. Do not execute.
- **Plan actions are parked.** Propose first actions from an approved plan. Approve or reject. Do not execute.
- **Owner work is parked.** The owner does approved actions and marks them. GroovGro does not execute.
- **What changed is parked.** Compare the Goal number after owner work. Do not execute.
- **Next step learning is parked.** Coordinate drafts, Your work, and what changed. Do not execute.
- **Growth story is parked.** One path so far. Do not execute.
- **Next Goal is parked.** Draft the next Goal after one is reached. Do not execute.
- **Activate Goal (this slice).** Make a reviewed draft the active Goal. Do not execute. Do not start ads.

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
14. **Activate Goal** — make a reviewed draft the active Goal. This slice.
15. **Guarded automation** — only after the above is trusted.

V1 website builder, SEO, Brand Voice, and Stripe stay available throughout.
