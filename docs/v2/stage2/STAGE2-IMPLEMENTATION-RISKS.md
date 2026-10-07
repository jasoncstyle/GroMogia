# Stage 2 — Implementation risks

High-risk items for later phases. Phase A does not mitigate in code.

## Security and authority

| Risk | Why it is real today | Rule |
| --- | --- | --- |
| **OAuth mistaken for authority** | Connecting GSC/GA4/Stripe grants scopes. Owner may think GroovGro can publish or spend. | Two-gate. Default template: READ/ANALYZE/RESEARCH/PREPARE only. A3/A4 stay off. |
| **User RBAC vs product grants** | `publish_website` and `approve_actions` exist on roles. Easy to treat as execute. | Keep RBAC for *who can use the app*. Product grants decide *what GroovGro may do*. Server-side. |
| **Tokens in worker payloads** | Scout GET already sends stored data. Tempting to pass refresh tokens “so SEOgro can pull GSC.” | Forbidden. `secretRef` stays in Connections. AT-CONN-02. |
| **CAPTCHA / login circumvention** | Blocked-source ladder mentions alternate read-only methods. | RC-1: stop that method. No solver, no bot-evasion, no fake login. Record barrier. Continue ladder. |
| **PII to specialists** | CRM and Stripe copies exist. Easy to dump into a pack. | Minimize. Default deny raw customer PII. Aggregate/redact. |
| **Execute adapters already in tree** | `requestExecute`, CMS publish, `competitorSearchEnabled()` exist and are off. | Do not “flip the flag to test.” Tests must keep asserting off. |
| **stripe-osa / card data** | Live checkout must not change. | No Stage 2 phase touches stripe-osa or card storage. |
| **Cross-tenant Brain** | Multiple orgs (e.g. two sailing businesses). | Every new table `organization_id`. No silent inheritance. AT-ISO-01. |
| **Audit payload leaks** | New event types will log connections and QA. | Never put tokens or raw PII in `audit_events`. |

## Data / migration

| Risk | Mitigation |
| --- | --- |
| Treating `business_brains` as already Stage 2 | Phase C additive. Dual-read. No auto VERIFIED. |
| Auto status flip to PROVISIONAL/SUPERSEDED | Locked D-28. Preserve originals. |
| Fabricated TIME TO MVBB for old orgs | NOT MEASURED if anchors missing. Never estimate. |
| Unique `(org, provider)` on connections | Blocks multi-property Google. Phase E needs `connection_resources`. Do not silently pick a property. |
| Markdown Harbor/Albatross/MBSS import too early | Phase G only. Read-only sources. |
| Collapsing Growth Memory into `decision_records` and also calling it OwnerDecision | See OD-3. Split if both meanings collide. |

## Product / UX

| Risk | Mitigation |
| --- | --- |
| Bolting Stage 2 onto the 20-item console | Replace shell in B. Do not add Fact admin to SEO. |
| Shipping Brain schema codes to owners | Default UI: plain English. S1–S6 advanced only. |
| Questionnaire onboarding | Name, website, optional goal. Retrieve→Need→Consequence→Ask. |
| Completeness % | Forbidden as primary model. |
| Starting Worker Gateway in B | Forbidden. B is schema-free. |
| Enabling A3 because “the ledger is ready” | Ledger ≠ permission. Jason names a connector first. |

## Sequencing

| Risk | Mitigation |
| --- | --- |
| C before B | Don’t, unless Jason asks. Shell first, low migration risk. |
| D MVBB without Fact-Use Gate | MVBB would rubber-stamp flat JSON. D after C. |
| F dispatch without two-gate | F after E. HARD-LIMIT includes permission limits. |
| Parallel agents rewriting nav and Brain | One phase owner at a time. |

## Conflict rule

If implementation wants a different product behavior because it is easier: **stop**, document CURRENT / REQUIREMENT / CONFLICT / RECOMMENDATION / OWNER DECISION NEEDED. Do not silently resolve.
