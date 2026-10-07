# Phase A — Implementation plan

**Date:** 7 October 2026  
**Repository inspected:** `jasoncstyle/GroMogia` `main` at `3745f55` (merge of Phase 0 audit #334)  
**Design sources read:** Stage 2 Step 12 FINAL package (`00`–`20`, coordinator acceptance, QA 01–03, Skill v1.3), plus in-repo `README.md`, `AGENTS.md`, `docs/MASTER_BRIEF.md`, `docs/STATUS.md`, `docs/v2/PHASE_0_AUDIT.md`, `docs/v2/ARCHITECTURE.md`, `docs/v2/V2_AMENDMENTS.md`, `src/lib/db/schema.ts`, `src/lib/permissions.ts`, bot routes, app shell.

**This phase does not implement Stage 2 features.** No migrations, no shell rewrite, no Worker Gateway, no A3/A4.

---

## 1. PARTIAL REBUILD — confirmed

Owner-accepted 7 October 2026, 7:18 AM ET:

| Mode | Meaning |
| --- | --- |
| **REUSE** | Sound, aligned systems stay |
| **REFACTOR** | Close but structurally incomplete |
| **MIGRATE** | Stronger structure required |
| **REPLACE** | Owner experience or architecture conflicts with Stage 2 |
| **DO NOT WIPE** | Neon, Clerk, Vercel, integrations, sound business data |

Phase 0 direction is **OWNER ACCEPTED:** KEEP STORE · REPLACE OWNER SURFACE · KEEP A3/A4 OFF · EXTEND FOR STAGE 2.

CLEAN REBUILD remains withdrawn (D-29). Incremental polish of the current console is too weak.

---

## 2. What to preserve (reuse)

Organizations / memberships / RBAC · Clerk · Neon · Vercel · workspace switcher · Search Console read-only · GA4 read-only · Stripe copies · CRM / contacts / leads · website reads · offers · goals · plans · Brand Voice · scheduler / jobs · audit events · notifications · bot routes (`/api/bots/scout`, `/api/bots/[seat]`) · `growth_actions` · `decision_records` · `execution_requests` and CMS publish adapters **off** · `autonomy_level` default 2 · `growth_director` / `guarded_automation` false.

Do not rebuild these to simplify Stage 2.

---

## 3. What to extend (refactor / migrate)

| Current | Stage 2 target | First phase that may touch schema |
| --- | --- | --- |
| `business_brains` flat fields | Fact / Observation / Source / Contradiction / Fact-Use Gate | **C** |
| `offers` | Offering entity + Brain links | C (link), keep table |
| `growth_goals` | Business Objective | C (link), keep table |
| `brand_voice_*` | BrandVoiceProfile with status | C (status), keep tables |
| `decision_records` | Growth Memory boundary | **G** |
| `growth_actions` | Action Ledger fields | **G** |
| `integration_connections` | Connection + resource→business mapping + health | **E** |
| User RBAC (`permissions.ts`) | Keep. Add product `PermissionGrant` (two-gate) | **E** (grants); RBAC stays |
| `growth_settings.autonomy_level` | Map toward default template; not the full grant model | E |
| Next step / work / notifications | Owner Decision Queue + Attention Items | **D** |
| Bot GET/POST packs | Job Package + Worker Gateway + HARD-LIMIT + QA | **F** |
| `audit_events` / `notifications` | Keep; add Stage 2 event types | C–G as needed |

---

## 4. What is new (do not pretend the flat Brain already does this)

Facts · Fact history / supersession · Content Observations · Sources / provenance (S1–S6) · domain authority notes · risk · freshness · Fact-Use Gate · Contradictions · Intake items · MVBB assessment · capability readiness · onboarding run + TIME TO MVBB · Owner Decision Queue · Owner Questions · Attention Items · question metrics / budget · Permission template / grants · Connection resources · Job Packages · HARD-LIMIT fidelity checks · Data Requests · QA reviews / verdicts · Growth Memory entries (as a bounded store) · blocked-source and missing-connector ladders.

---

## 5. What to replace (owner surface)

App shell (~20 sidebar items) · Dashboard visual desk as Home · Bot team as a primary product · Search desk as the product · listed-first / remaining-count factory · setup-style onboarding.

Target: **Home | Grow | Work | Results | Business**. Settings holds complexity. Hide bot names, tokens, S1–S6 codes, workflow nodes.

---

## 6. Recommended phase order

Keep the approved Stage 2 A–G order. Do not silently merge C–F into B.

| Phase | Work | Schema? | Starts only when |
| --- | --- | --- | --- |
| **A** | This plan + Phase 0 status correction | No | Done in this PR |
| **B** | Five-screen shell over existing data | **No** | Owner authorizes Phase B |
| **C** | Fact / Observation / Source / Contradiction + Fact-Use Gate | Additive | After B accept or parallel only if Jason asks |
| **D** | MVBB, readiness, ODQ, learning onboarding | Additive | After C gate exists (ODQ can stub Attention vs Question earlier if needed) |
| **E** | Connection Manager, resource mapping, two-gate | Additive | After D permission boundary is required for MVBB |
| **F** | Job Packages, Worker Gateway, HARD-LIMIT, QA gate | Additive | After E two-gate; wrap existing bot routes |
| **G** | Ledger / Growth Memory fields, fixtures, hardening | Additive | After F; Harbor/Albatross/MBSS importers |

**Dependency change I recommend (not an architecture change):** keep B first and **schema-free**. Stage 2 `13-` already says this. MASTER_BRIEF V3 “Phase 1” bundled shell + Worker Gateway + chat. **Follow Stage 2 A–G**, not that bundled Phase 1. Chat stays explain/navigate and can wait until D/F.

**Do not start C before B** unless Jason explicitly wants Brain tables before the owner can see five screens. B proves the UX lock without migration risk.

---

## 7. Tests that must exist before each later phase

| Before | Required tests (write first) |
| --- | --- |
| **B** | Existing `tenant.test.ts` still green. Shell tests: five primary nav items; `/app/bot-team` not in primary nav; old `/app/next-step` redirects; no bot names on Home/Grow/Work; mobile nav shows five items. No new DB. |
| **C** | AT-FACT-01–04 (observation ≠ verified price; no confidence-% primary; supersession links; isolation). Fact-Use Gate unit tests. Original `business_brains` rows still readable. |
| **D** | AT-MVBB-01–06, AT-ODQ-01–05. App cannot set MVBB ACHIEVED without QA. TIME TO MVBB never estimated. Attention not counted as questions. |
| **E** | AT-PERM-01–03, AT-CONN-01–06. Tokens absent from any worker payload. Ambiguous GSC/GA4 property not auto-assigned. Two-gate deny when connector can publish but grant is PREPARE. |
| **F** | AT-JP-01, AT-QA-01–02. HARD-LIMIT recorded before dispatch. QA PASS does not call `requestExecute`. Existing scout/draft/write GET/POST still work. |
| **G** | Ledger/Brain/GM boundary tests. Fixture import dry-run. Secret scan. `14-` suite as it lands. |

Phase A itself: run existing tenant and permission tests (see STATUS report). No new Stage 2 feature tests yet.

---

## 8. Migration dependencies

1. **Do not migrate `business_brains` in Phase B.**  
2. Phase C: additive Fact tables; copy/snapshot existing Brain JSON; **no auto status flip**.  
3. Offers / goals / voice stay canonical until Fact links exist.  
4. Markdown Harbor / Albatross / MBSS importers wait for **G**. Preserve originals.  
5. Live businesses (including sailing-school orgs) stay on current tables until C+ cutover review.  
6. Connection tokens stay in `secret_ref` / existing secret handling — never move into Brain or Job Packages.

---

## 9. Security / permission findings (summary)

See [STAGE2-IMPLEMENTATION-RISKS.md](STAGE2-IMPLEMENTATION-RISKS.md).

- User RBAC ≠ product authority. Adding `publish_website` to a role must not become A3.  
- `secretRef` on `integration_connections` is the right pattern; keep tokens out of bot GET payloads.  
- Two-gate must be server-side.  
- CAPTCHA / login walls: stop that method (RC-1). Do not add a scrape or “browser bypass” helper.  
- `requestExecute` and CMS publish stay off.  
- Cross-tenant: keep `organization_id` on every new table; extend `tenant.ts` tests.

---

## 10. Conflicts found

Documented in [STAGE2-OPEN-DECISIONS.md](STAGE2-OPEN-DECISIONS.md). None require changing product behavior to make coding easier.

Stale package text in `16-OPEN-QUESTIONS` (OQ-12-01–04: “no repo / no Vercel”) is **superseded** by D-29 and this live repository. Not an owner product reopen.

---

## 11. Next Cursor assignment (after owner approval)

**Phase B only:** five-screen shell over existing Goal, Next step, work queues, alerts, Brain/Voice summaries. Redirects. Hide bot names. **No new tables. No A3. No Worker Gateway.**
