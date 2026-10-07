# V3 amendments (binding fences)

The GroovGro V3 Master Plan is the product direction. These amendments are **not optional**. They stop the plan from quietly turning on scrape, ads, send, or live-site writes.

Cursor, humans, and later workers follow this file even when the PDF says “execute,” “SERP,” “Research,” or “Playbook.”

---

## 1. Do not wipe production

Do not delete Neon, Clerk users, organizations, or Vercel. Do not restart from an empty app. The Phase 0 decision is: **new storefront, same store.**

Tag `pre-v2-architecture-checkpoint` remains the V1 snapshot. Current `main` remains the working V2.2 backend.

---

## 2. Authority stays capped until Jason names a door

| Level | Meaning | Now |
| --- | --- | --- |
| A0 Observe | Read and analyze stored or owner-named sources | On |
| A1 Recommend | Propose | On |
| A2 Prepare | Finished drafts. Do not publish | On. **Default.** |
| A3 Execute approved | One specifically approved external action | **Off** until Jason names the connector (for example WordPress) and says to write |
| A4 Autonomous | Narrow standing permission | **Off.** Growth Director and guarded automation stay false |

One approval never grants blanket write access. `requestExecute` and the CMS publish adapter exist and stay off.

Website apply model stays: suggest → owner approves or rejects → apply only if an official connector exists. Custom / code-hosted sites stay “here is what to paste.” GroovGro-hosted pages may apply title, description, and heading drafts after the owner clicks Apply.

---

## 3. Research is not a search-engine scrape

The plan lists competitor, market, SERP, and sentiment skills. Until Jason asks **by name** for a licensed source:

- Use Search Console, GA4, pages GroovGro already read, owner-named public URLs, and owner-pasted pages.
- Owner-named competitor homepages may be fetched. If the host blocks, use the public page reader or a paste.
- `requestCompetitorSearch` / `competitorSearchEnabled()` stay off.
- Do not scrape Google, Bing, social networks, or AI answer pages.
- Do not install OpenSERP or any “free SERP API.”
- Do not connect Google Ads or Keyword Planner. An owner-pasted Planner file can wait.
- Search Console OAuth stays `webmasters.readonly`. Analytics stays `analytics.readonly`. No Ads scopes.

---

## 4. Playbook and cross-business learning wait

Business Brain facts and verified connected sources for **this** organization outrank research, Growth Memory, playbook text, and worker memory.

Worker memory is never authoritative business truth.

A generalized GroovGro Playbook (learning across businesses) is Phase 4 of the new plan only. It must be aggregated and anonymized. Do not start it in Phase 1. Do not leak one organization’s SEO, customers, or copy into another.

---

## 5. Hide the workforce from the owner

Internal seats may still be SEOgro, DRAFTgro, WRITEgro (and later others). Desk tokens stay per organization.

Normal owner screens say **“GroovGro is working on it.”** They do not show bot names, bot IDs, pack schemas, or workflow nodes.

Bot team is Settings → advanced, not a primary nav item, after the shell ships.

GroovGro does not wake bots until Jason has an inbound URL and asks. Bots keep GETing and POSTing. Do not make Jason the permanent paste courier, and do not invent a wakeup.

BOOKSgro stays parked (403). Do not send payment copies or take a books pack.

---

## 6. Chat is not the product

Ask GroovGro explains and navigates. Phase 1 chat must not change application state (“stop the Bahamas page,” “focus on free marketing”) until the Action Ledger can record that change safely.

---

## 7. Do not start these until Jason asks by name

- Ads (Google Ads, Meta, or any spend)
- Email send
- Social post or schedule
- GEO / AI-platform lookup
- Licensed SERP vendor
- Live CMS write
- Growth Director / guarded automation
- Resume the paused website builder
- Custom domains for GroovGro-built sites
- Cross-tenant Playbook

---

## 8. Money, Stripe, and sailing

- Never store payment card data.
- Never charge a card from GroovGro.
- Do not change Ocean Sailing Adventures live Stripe checkout or the **stripe-osa** endpoint.
- Do not hard-code sailing businesses, organization IDs, or domains into product logic. Examples in the plan (sailing school, pottery studio) are illustrations only.

---

## 9. Language and estimates

- Explain conclusions. Do not dump data.
- Admit when evidence is insufficient. “We don’t know yet” is allowed.
- Never manufacture wins.
- Do not present estimates as facts.
- Do not treat one AI answer as absolute truth.
- Do not publish groovgro.com `robots.txt` or `sitemap.xml` for tenant builder pages.

---

## 10. Phase 0 accepted; Phase B waits for a separate authorize

Phase 0 is **OWNER ACCEPTED** (7 October 2026). See [STATUS.md](../STATUS.md).

Do not build the five-screen shell, rewrite navigation, or delete current screens until STATUS says **Phase B is authorized**.

Stage 2 Fact / MVBB / ODQ / Connection Manager / Worker Gateway / QA engine wait for their phases (C–F). Do not bolt them onto the old console.

Until Phase B: keep production running. Fix breakage. Do not add listed-first polish to the old console.

## 11. Stage 2 locks (extend Phase 0)

Observation ≠ Fact. UNKNOWN > assumed. PROVISIONAL is allowed. Fact-Use Gate before material use. Two-gate authority (connector capability ∩ owner grant). QA PASS ≠ execute. Specialists never receive OAuth tokens. Retrieve → Need → Consequence → Ask. Attention Item ≠ Owner Question. CAPTCHA / required login must not be circumvented. Customer PII minimized. Business truth lives in GroovGro, not worker memory.

Do not collapse Brain, Connections, Permissions, Queue, Ledger, and Growth Memory into one table.
