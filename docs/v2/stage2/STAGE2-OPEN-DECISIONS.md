# Stage 2 — Open decisions and conflicts

Phase A conflict rule: do not silently pick a different product behavior.

Format: CURRENT STATE · STAGE 2 REQUIREMENT · CONFLICT · RECOMMENDATION · OWNER DECISION NEEDED.

---

## OD-1 — Phase 0 status text vs owner acceptance

**CURRENT:** `docs/STATUS.md` (until this PR) said Phase 0 was not accepted.  
**STAGE 2:** Owner accepted 7 October 2026 7:18 AM ET (KEEP STORE · REPLACE OWNER SURFACE · KEEP A3/A4 OFF · EXTEND FOR STAGE 2).  
**CONFLICT:** Stale repo status. Not a product-behavior conflict.  
**RECOMMENDATION:** This Phase A PR updates STATUS and related docs. Phase B still waits for a separate authorize.  
**OWNER DECISION NEEDED:** **NO** (already decided). This PR is the deferred repo commit.

---

## OD-2 — Stale `16-OPEN-QUESTIONS` (no repo / no Vercel)

**CURRENT:** Live app on `jasoncstyle/GroMogia`, Vercel `gro-mogia`, Clerk, Neon.  
**STAGE 2:** D-29 / D-32-note: those OQs were written before GroMogia was identified.  
**CONFLICT:** Package file `16-` still lists OQ-12-01–04 as open.  
**RECOMMENDATION:** Treat OQ-12-01–04 as **CLOSED**. Substrate is Next.js + Clerk + Neon + Vercel. Do not create a new repo. Do not reopen CLEAN REBUILD.  
**OWNER DECISION NEEDED:** **NO**.

---

## OD-3 — `decision_records` as OwnerDecision vs Growth Memory

**CURRENT:** One `decision_records` table (plan approve/reject, etc.).  
**STAGE 2:** OwnerDecision is Brain-facing (“owner confirmed X”). Growth Memory is learned performance. They must not collapse into Brain Facts.  
**CONFLICT:** One table cannot honestly be both without mixing meanings.  
**RECOMMENDATION:** Keep `decision_records`. Add `growth_memory_entries` in G if lessons do not fit. Brain OwnerDecisions in C if confirmations need Fact links. Do not reuse `decision_records` as the Fact store.  
**OWNER DECISION NEEDED:** **NO** for Phase A/B. **YES** only if Jason wants a single “decisions” concept in the UI (advanced). Default: split stores, one “What we’ve learned” screen.

---

## OD-4 — MASTER_BRIEF V3 Phase 1 vs Stage 2 A–G

**CURRENT:** V3 brief Phase 1 lists shell + Worker Gateway + chat + Action Ledger fields together.  
**STAGE 2:** B shell (no DB) → C Brain → D MVBB/ODQ → E connections → F JP/gateway → G ledger/memory.  
**CONFLICT:** Sequencing only. Same architecture.  
**RECOMMENDATION:** **Follow Stage 2 A–G.** Treat V3 “Phase 1” as the *era*, not one PR. Chat stays explain/navigate; no state-changing commands in B.  
**OWNER DECISION NEEDED:** **NO** unless Jason wants Brain tables before the five-screen shell.

---

## OD-5 — User RBAC `publish_website` vs A3 off

**CURRENT:** Roles include `publish_website`, `manage_advertising`, `configure_automation`.  
**STAGE 2:** Default product template forbids CHANGE/PUBLISH/SEND/SPEND without approval. A3/A4 off.  
**CONFLICT:** A website manager role looks like publish authority.  
**RECOMMENDATION:** Do not remove RBAC. Phase E adds PermissionGrant. Until then, adapters stay off — role ≠ execute. Do not implement A3 because a permission string exists.  
**OWNER DECISION NEEDED:** **NO**.

---

## OD-6 — Person entity vs CRM contacts

**CURRENT:** `contacts`, `customers`, `users`.  
**STAGE 2:** Brain Person (owner, instructor, spokesperson) when useful.  
**CONFLICT:** Easy to overload CRM as Brain people and leak PII into Job Packages.  
**RECOMMENDATION:** Do not use CRM rows as Brain Facts. Add Brain Person only when a Fact needs it. Specialists do not get raw customer lists by default.  
**OWNER DECISION NEEDED:** **NO**.

---

## OD-7 — First connector priority (OQ-12-05)

**CURRENT:** GSC, GA4, Stripe copies, website read already exist. Shopify/etc. do not.  
**STAGE 2:** Progressive connections; first *new* connector order is IMPLEMENTATION CHOICE.  
**CONFLICT:** None for B–D. Phase E should extend existing Google/Stripe mapping before adding Shopify.  
**RECOMMENDATION:** Phase E priority: resource-map **existing** GSC/GA4/website/Stripe. New providers only when Jason names one.  
**OWNER DECISION NEEDED:** **YES** before Phase E if a new provider (Shopify, etc.) should jump the queue. Otherwise no.

---

## OD-8 — Authorize Phase B

**CURRENT:** Phase 0 accepted. Shell not built. This Phase A plan is written.  
**STAGE 2:** Phase B is the next coding slice; this assignment says do not start B without owner approval.  
**CONFLICT:** Process gate only.  
**RECOMMENDATION:** After this PR is reviewed, Jason replies **approve Phase B**. Then a new branch builds the five-screen shell only.  
**OWNER DECISION NEEDED:** **YES** — authorize Phase B (shell, no new tables) when this plan looks right.

---

## Closed / not reopen

- CLEAN REBUILD  
- Wipe Neon / Clerk / Vercel  
- Confidence % as primary trust  
- OAuth = business permission  
- QA PASS = execute  
- Completeness-first onboarding  
- Specialists receive tokens  
- Silent cross-business Brain sharing  
- A3/A4 on  
- OpenSERP / Ads scopes / Keyword Planner connect  
- Resume website builder  
- Cross-tenant Playbook  
- Website Truth Skill  

## Deferred (do not invent)

Exact freshness TTLs · pixel design system · disconnect retention days · numeric SLAs · encryption marketing claims · LoopyLearn merge · employee-delegate product (RBAC already exists; do not expand Stage 2 around it).
