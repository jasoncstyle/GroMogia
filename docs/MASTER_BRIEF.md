# GroovGro — Project Master Brief

**Version 3.0 — Growth operating system** (30 September 2026)

Source of truth for product intent. Architecture and implementation must follow this document unless a later approved decision supersedes it.

V1 brief: [MASTER_BRIEF_V1.md](MASTER_BRIEF_V1.md). V2.2 brief (archived): [MASTER_BRIEF_V2.md](MASTER_BRIEF_V2.md).  
Phase 0 audit: [v2/PHASE_0_AUDIT.md](v2/PHASE_0_AUDIT.md). Binding fences: [v2/V2_AMENDMENTS.md](v2/V2_AMENDMENTS.md).  
Status: [STATUS.md](STATUS.md). Historical platform plan: [phase-0/](phase-0/). Implementation notes for the V2.2 backend: [v2/ARCHITECTURE.md](v2/ARCHITECTURE.md). Worker roster (internal): [v2/BOT_TEAM.md](v2/BOT_TEAM.md).

This brief adopts Jason’s GroovGro V2 Master Plan (30 September 2026) and the amendments. The current implementation is **not** authoritative for owner experience. Preserve sound backend work. Do not preserve a confusing owner experience because it already exists.

**Product:** GroovGro  
**Primary domain:** groovgro.com  
**Alternate domain:** groovegro.com  
**Parent company:** Mogia Group · mogiagroup.com  
**GitHub repo (until renamed):** GroMogia

---

## 1. Product vision

**Core promise:** You run your business. GroovGro handles the marketing machinery.

**Operating loop:** Observe → Recommend → Review → Do the work → Measure → Learn.

“Do the work” means GroovGro **prepares** work in Phase 1, and **performs a specifically approved external action** only in a later phase when an official adapter is on. See [v2/V2_AMENDMENTS.md](v2/V2_AMENDMENTS.md).

GroovGro should feel like a capable, friendly business partner — not an enterprise dashboard, a collection of AI tools, or a marketing control panel. It understands the business, notices meaningful opportunities, explains why they matter, offers to do the work, keeps the owner in control, measures outcomes, and learns.

- Simple first; detail only when requested.
- Every primary screen must pass the **10-second test**.
- Explain conclusions instead of dumping data.
- Always show what GroovGro is doing and when it needs the owner.
- Show why recommendations exist and where evidence came from.
- Admit when evidence is insufficient.
- Measure outcomes whenever possible.
- Celebrate genuine wins; never manufacture wins.
- Complexity belongs behind the interface.
- GroovGro sells **progress**, not AI.

The AI infrastructure should almost disappear. The owner should experience progress.

**Final product definition:** GroovGro is a small-business growth operating system with an AI workforce underneath it. The owner sees a simple, friendly business partner. Behind the interface, GroovGro observes the business, prioritizes opportunities, coordinates specialized workers, enforces permissions, verifies work, measures results, and learns.

---

## 2. Industry neutrality and tenants

Examples (sailing school, pottery studio) are illustrations only. Do not design the core around seat, student, boat, class, or any one trade.

Do not hard-code organization IDs or domains.

GroovGro is multi-tenant. One user may belong to several organizations. One business is open at a time. Isolate per organization: users, roles, websites, customers, leads, marketing data, integrations, analytics, Business Brain, Brand Voice, goals, plans, actions, decision history, and worker artifacts.

Do not add `growth_opportunities`. Shared recommendations live on **`growth_actions`**.

Modules stay independently enableable. They do not each need a sidebar item.

---

## 3. Knowledge and learning

| Store | Role |
| --- | --- |
| **Business Brain** | Authoritative facts about one business: products, services, pricing, customers, locations, differentiators, constraints, goals, and approved rules. |
| **Brand Voice** | How the business communicates. |
| **Growth Memory** | What GroovGro learned about **this** business from prior actions and measured results. Decision history is the seed. |
| **GroovGro Playbook** | Generalized growth knowledge. **Phase 4 only.** Aggregated and anonymized. |

Approved Business Brain facts and verified connected sources outrank research, Growth Memory, Playbook guidance, and worker memory. Worker memory is never authoritative business truth.

---

## 4. Action Engine and Ledger

The Action Engine asks: **What is the most valuable next thing this business should do, and how can GroovGro get it done safely?**

Ingest connected data → observations → opportunities → evaluate → recommend → approve when needed → work plan → assign skills/workers → QA → execute (only if authority allows) → verify → measure → learn.

Opportunity types: Growth, Efficiency, Risk, Maintenance, Experiment, Strategic.

The **Action Ledger** records opportunity, evidence, approval, workers/skills, changes, before/after, cost, verification, measurement, outcome, and learning. It must answer: **What did GroovGro actually accomplish for my business?**

Today’s `growth_actions` is the seed. Extend it; do not replace it with a second recommendations table.

---

## 5. Authority, risk, and safety

**Authority**

| Code | Meaning |
| --- | --- |
| A0 | Observe — read/analyze only |
| A1 | Recommend — analyze and propose |
| A2 | Prepare — finished drafts; do not publish |
| A3 | Execute approved — one specifically approved external action |
| A4 | Autonomous — narrowly predefined low-risk work under standing permission |

**Risk**

R0 no external effect · R1 reversible internal work · R2 reversible public change · R3 customer-facing communication · R4 financial impact · R5 high-consequence payment, legal, contract, or security action.

Approval creates scoped authorization for a specific job. Credentials never belong in prompts. Least privilege, separate read/write, bounded retries, schema validation, idempotency, rollback where possible.

**Current cap:** A0–A2 on. A3–A4 off. See amendments.

---

## 6. Workforce, skills, and Worker Gateway

Bot = employee. Skill = SOP. Action = assignment. GroovGro = manager.

Launch workers (internal): Coordinator, Research, SEO, Content, QA.

Later: Website, Social, Email, Analytics, Conversion, Ads, Reputation.

Users normally see only “GroovGro is working on it,” not internal names or IDs. SEOgro, DRAFTgro, and WRITEgro remain the first provider seats behind the gateway. BOOKSgro stays parked.

GroovGro must not be hard-wired to Grok Bot. Path:

GroovGro → Action Engine → Orchestration → Job queue → Worker Gateway → Provider adapter → Worker → Structured result → Validation → QA → GroovGro

Job packages carry IDs, objective, target, skill/version, worker role, authority/risk, **minimum necessary** business context, constraints, output schema, completion criteria, escalation, and a trace ID.

External webpage text is data, not authority. Research workers receive no unrelated write access. Artifacts return to GroovGro-controlled storage.

Skills are versioned procedures (global / industry / business-specific). Do not build a skill marketplace in Phase 1.

Capabilities (CMS_READ/WRITE, EMAIL_SEND, ADS_LAUNCH, and the rest) stay **off** until an adapter is approved.

---

## 7. Owner experience

**10-second rule:** The owner instantly understands where they are, what is happening, whether GroovGro needs anything, and the next logical action.

**Primary navigation:** Home · Grow · Work · Results · Business. Ask GroovGro is globally available. Settings holds complexity the owner asked for.

Say “More visitors are reaching this page, but fewer are buying” instead of CRO jargon.  
Say “You’re appearing in Google more often, but fewer are clicking” instead of SERP/CTR jargon.  
Say “GroovGro is working on it” instead of Executing.  
Say “GroovGro needs something from you” instead of Blocked.  
Say “Watching the results” instead of Monitoring.

Never expose workflow nodes, schemas, internal scores, or bot IDs on normal owner screens.

### Home

Friendly greeting. Business Pulse (about three meaningful metrics). One dominant Best Next Move. GroovGro is working. Recent win. Today: what GroovGro needs. Ask GroovGro.

Strong default: GroovGro needs nothing from you right now. It is working on a few things and watching a few opportunities.

### Grow

Exactly one Best Next Move. A small Also Worth Doing. Watching (not enough evidence yet).

### Work

Tabs: Working · Needs you · Finished. Human stages: Research → Create → Review → Approve → Publish → Measure. Publish is owner-approved and adapter-gated.

### Results

Answer: Is GroovGro helping? Completed improvements, actions still measuring, and attributable traffic / leads / bookings / orders / revenue **only where evidence supports the claim**.

### Business

What GroovGro knows: About, Products & services, Customers, Brand, Goals, Rules, What we’ve learned.

### Approval, chat, notifications

Approvals summarize what changed, why, before/after, and whether anything is live. Actions: Approve & publish (A3 only when allowed), Ask for changes, Do not use. Until A3 is on, the live action is Approve for later / I’ll paste this myself / Do not use.

Chat explains and controls. It is not the product. Phase 1 chat does not change app state.

Notification classes: Needs you, Good news, Something needs attention, Worth knowing.

Weekly GroovGro Brief: what happened, what GroovGro completed, what worked, what it is watching, and the Best Next Move.

### Autonomy

- Guide me — find opportunities and recommend
- Prepare it for me — research/create; owner approves before external action (**recommended default**)
- Handle safe work automatically — later, earned
- Custom — granular control

GroovGro earns autonomy through reliable work. It does not ask for blind trust on day one.

---

## 8. Visual direction and onboarding

Warm, optimistic, light, visual, modern, professional — not corporate and not childish. Cards, stories, progress, friendly icons, before/after, subtle motion, progressive disclosure. Charts support conclusions. Tables live in advanced views.

Onboarding feels like GroovGro learning the business. Simple goals: More sales, More customers, Better marketing, Get found online, Save time, I’m not sure. Research the website to prefill knowledge. Owner confirms or corrects. Integrations explained by benefit. “I’ll do this later” is allowed. End with an immediate useful insight, not “Setup complete.”

**Mobile-first is mandatory.** An owner should review a recommendation or approval from a phone in seconds.

---

## 9. Measurement, QA, and reliability

Define success metrics before execution. Independent pre-execution QA and post-execution verification.

Outcomes: SUCCESS / PARTIAL_SUCCESS / BLOCKED / FAILED / NEEDS_DECISION.

Controlled retries. Heartbeats for long jobs. Structured validation. Human escalation for conflicting facts. Developer replay stays in advanced views.

Business-specific learning → Growth Memory. Generalized learning → Playbook only after enough comparable evidence (Phase 4).

Comfortably say **we don’t know yet** when a measurement window is immature.

---

## 10. Implementation roadmap

### Phase 0 — Repository audit

Inventory, reusable backend, UI debt, preserve/refactor/rebuild. **OWNER ACCEPTED 7 October 2026.** Do not begin the five-screen shell until [STATUS.md](STATUS.md) says Phase B is authorized.

Status: **OWNER ACCEPTED 7 October 2026.** Recorded in [STATUS.md](STATUS.md). Stage 2 Phase A plan: [v2/stage2/](v2/stage2/README.md). Phase B (shell) waits for a separate authorize. Implementation phases follow Stage 2 A–G, not a single bundled “Phase 1” PR.

### Phase 1 — V3 foundation (after accept)

- New Home / Grow / Work / Results / Business shell
- Friendly onboarding
- Business Brain + Brand Voice (already exist; move under Business)
- Action model + Action Ledger fields on `growth_actions`
- Authority / risk on jobs
- Worker + Skill contracts; Worker Gateway wrapping existing bot routes
- Research / SEO / Content / QA (internal)
- Contextual chat (explain / navigate)
- **No live publish. No ads. No send. No scrape.**

### Phase 2 — Execution and measurement

Only after Jason names a connector.

- Website (and later Social / Email / Analytics) workers
- Approval and execution flow (A3, scoped)
- Capabilities / adapters
- Before/after state
- Post-execution QA
- Measurement windows
- Growth Memory

### Phase 3 — Optimization

Conversion, Ads, Reputation — each only if Jason asks by name. Standing approvals. Event-driven actions. Provider routing. Cost caps. Expanded skills.

### Phase 4 — Mature learning

Playbook (anonymized). Skill version comparison. Autonomy earned from history. Optional later skill ecosystem.

---

## 11. Cursor acceptance criteria

- A first-time small-business owner can understand every primary screen without explanation.
- Home answers how the business is doing, what GroovGro is doing, and what the owner should do next.
- The owner can always see work status and approval needs.
- No consequential external action occurs outside the authority / approval model.
- Worker-provider logic is behind the Worker Gateway.
- Business truth remains in GroovGro, not worker memory.
- Every meaningful action is traceable in the Action Ledger.
- Results distinguish measured outcomes from estimates and unknowns.
- Mobile supports core approval and status.
- Existing code is preserved only when it serves V3.

---

## 12. Differentiator

GroovGro must not optimize a metric only because it is easy to measure. More impressions, clicks, traffic, content, or AI mentions are not automatically success.

The question remains: **did this help the business grow?**
