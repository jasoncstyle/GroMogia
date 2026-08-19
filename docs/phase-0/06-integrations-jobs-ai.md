# Integrations, background jobs, and AI

## Integration / provider architecture

Internal data is **canonical**. Vendors plug in through **adapters**. UI and analytics never import `stripe` or `resend` except inside the matching adapter.

```text
Organization
  └── integration_connections (status, scopes, secret_ref)
        └── Adapter implements a capability interface

Capability examples:
  EmailProvider        sendTransactional, sendCampaign (later)
  PaymentProvider      listPayments, constructWebhook, customerId
  BookingProvider      listBookings, syncSince
  WebsiteProvider      fetchPages, injectTracker, listForms
  AdsProvider          listCampaigns, listSpend
  AnalyticsProvider    fetchTraffic
  ReviewsProvider      listReviews
```

Phase 1 ships the connection model and **no vendor adapters except health stubs**.

Phase 2 first adapters:

| Adapter | Provider | Why first |
| --- | --- | --- |
| `PaymentProvider` / `BookingProvider` | Stripe (existing Ocean Sailing Adventures booking) | Real money and customers |
| `WebsiteProvider` | Connected site (URL + optional WordPress/SiteGround) | Real traffic destination |
| `EmailProvider` | Resend | Transactional mail for invites and alerts |

Later adapters (Mailchimp, Google, Meta, Square, TripAdvisor) implement the same interfaces. Do not spread `if (provider === 'meta')` through the app.

Disconnect must be a first-class operation: revoke token, mark disconnected, stop jobs, keep historical canonical records.

## Background jobs

All jobs run in Vercel cloud infrastructure, never on a developer machine.

| Kind | Mechanism | Examples |
| --- | --- | --- |
| Incoming event | Route Handler + signature verify | Stripe webhooks |
| Schedule | Vercel Cron | Daily summary, token refresh, stale sync |
| Durable multi-step | Vercel Workflow | SEO crawl, large analytics import, AI analysis |
| Short compute | Vercel Function | “Sync last 100 bookings now” |

Job rules (brief §23):

- **Retryable** — transient failures retry with backoff.
- **Idempotent** — Stripe event IDs and external booking IDs are unique keys; replays do not duplicate contacts.
- **Observable** — `job_runs` table: name, organization_id, started_at, finished_at, status, error, payload cursor.
- **Failure-aware** — failed runs notify org admins and platform admin when systemic.

Do not use `node-cron` inside a Function. Do not SSH to SiteGround to run GroovGro jobs.

Webhook processing should acknowledge quickly, then continue work in a workflow/queue if it cannot finish safely in one invocation. Stripe event IDs are the idempotency key.

## AI architecture (high level)

Intelligence is a **layer**, not a product module that other modules call chaotically. Other modules expose **read models** (summaries of org-scoped facts). The intelligence module:

1. Loads only data for the active organization and enabled modules.
2. Respects `view_financials` and other permissions.
3. Uses the Brand Voice Profile when generating copy (Phase 5+).
4. Records every run in `ai_action_logs`.
5. Uses Vercel AI SDK + AI Gateway so the model vendor is not hardcoded.

### Automation levels

| Level | Phase allowed | Behavior |
| --- | --- | --- |
| 1 Observe | 4 | Analyze; no user-visible “do this” yet if we want to be conservative — or show observations only |
| 2 Recommend | 4 | Next actions with evidence |
| 3 Draft | 5–6 | Copy, SEO diffs, emails — require approval |
| 4 Approved automation | 9 | Allow-listed action classes after explicit org policy |
| 5 Autonomous rules | 9+ | Narrow, user-defined rules only |

Phase 4 must not execute. No tools that publish, spend, or email until Phase 9.

Prompt and retrieval context:

- Include: org brand, enabled modules, recent canonical metrics, approved voice examples.
- Exclude: other tenants, secrets, raw OAuth tokens, card data, unapproved writing samples.

Natural-language questions (“Why were sales lower this month?”) must return **evidence citations** to GroovGro records (campaign X, landing page Y), not unsupported chat.

## Notifications

Phase 1: table + in-app bell + Resend for invites.  
Later: types for lead, booking, payment, integration failure, SEO, anomaly, review, AI recommendation.

Preferences default to in-app on, email for high-severity only until the user chooses otherwise.
