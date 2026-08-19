# Authentication, authorization, and security

## Authentication (who you are)

**Clerk** hosts identity: sign-up, sign-in, sessions, MFA, password reset.

GroovGro stores a `users` row keyed by `clerk_user_id` and treats Clerk as the identity provider, not the source of truth for organizations, roles, modules, or billing.

Why not Clerk Organizations as the only org model? GroovGro orgs need module entitlements, Stripe customer IDs, brand, AI context, and audit. Those belong in Neon. Clerk orgs can be adopted later as a convenience; they must not become the only tenant key.

Session flow:

1. User signs in with Clerk.
2. Middleware (Next.js) verifies the session.
3. Server loads `users` + active `membership`.
4. If the user has multiple orgs, they pick one; it is stored in a secure cookie.
5. Request sets Postgres `app.organization_id` and a permission set in memory.

Platform Super Admins are a flag on `users`, not an org membership. Their `/platform` routes ignore org entitlements and are audited.

## Authorization (what you may do)

RBAC with **permissions**, not `if (role === 'admin')` scattered in UI.

- Seed system role templates (Owner, Admin, Marketing Manager, Website Manager, Sales/Lead Manager, Staff, Viewer).
- Clone templates into the organization so they can be customized later.
- Check permission keys in server actions and route handlers.
- Hide nav items the user cannot use (UX), but **always** enforce on the server.

Financial permission `view_financials` gates revenue widgets and Stripe amounts.

AI levels 4–5 require `approve_ai_actions` plus an org automation policy. Level 3 drafts still require a human approval record.

## Tenant isolation

See [04-data-model.md](04-data-model.md). Failures here are security bugs, not product bugs.

Automated tests in Phase 1 should include: user A in org 1 cannot read org 2 contacts by IDOR (guessing UUIDs).

## Secrets and credentials

| Secret | Where it lives | Client-visible? |
| --- | --- | --- |
| `DATABASE_URL` | Vercel + Cloud Agent secrets | No |
| `CLERK_SECRET_KEY` | Vercel + Cloud Agent secrets | No |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel | Yes (publishable) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Vercel | No |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel | Yes (publishable) |
| `RESEND_API_KEY` | Vercel | No |
| Org OAuth tokens (Google, Meta, …) | Encrypted at rest in DB or a secret manager, referenced by `integration_connections.secret_ref` | No |

Never commit `.env`. Never log tokens. Never put secrets in `environment.json`.

Webhook verification: Stripe (and later Google/Meta) signatures verified before any work. Reject unsigned requests.

## Application security baseline (Phase 1)

- CSRF: Server Actions + same-origin; webhook routes are signature-auth, not cookie-auth.
- XSS: React defaults; no `dangerouslySetInnerHTML` for user content unless sanitized.
- SQL injection: Drizzle parameterized queries only.
- Rate limit: public form posts and auth-adjacent APIs (Clerk also rate-limits auth).
- Validation: Zod on every mutation.
- Least privilege: Stripe restricted keys where possible; Clerk production/dev split.
- Environment separation: Preview/test keys never mixed with live keys.
- Headers: Vercel/Next security headers (CSP tightened as the app grows).
- Dependencies: GitHub Dependabot or equivalent once the app exists.
- Backups: Neon point-in-time recovery enabled in production.

## Integration security (Phase 2+)

OAuth where the provider supports it. UI must show: connected / error / disconnected, scopes, last sync, last error, reconnect, disconnect (revokes tokens).

Store `expires_at` and refresh in a cloud job, not on a laptop.

## Audit

If it changes access, money, publishing, integrations, or AI execution, it is an `audit_events` row. Audit is append-only.

## Security concerns to treat as first-class

1. **Cross-tenant leaks** — highest risk in a shared-schema SaaS. RLS + scoped helpers + IDOR tests.
2. **Public repo** — https://github.com/jasoncstyle/GroMogia is public. That is fine for code, fatal for secrets. Assume anything committed is world-readable.
3. **Webhook forgery** — Stripe/Google endpoints on Vercel must verify signatures.
4. **Public lead forms** — unauthenticated writes into a tenant; need form tokens bound to `organization_id` and rate limits.
5. **AI over-reach** — no tool that mutates production systems until level 4+ and an allow-list.
6. **File enumeration** — Blob URLs must not be guessable across tenants; prefer private blobs + signed URLs.
7. **Platform admin** — phishing or a stolen super-admin session is catastrophic; MFA required, separate from org Owner.
8. **SiteGround / WordPress credentials** — if we ever store WP application passwords, they are as sensitive as Stripe keys.
9. **PII** — leads and customers are personal data. Minimize logs; do not send PII to AI providers beyond what the org has enabled.
10. **Card data** — Stripe.js / Checkout / Elements only. GroovGro never sees PAN.

## What we will not build for security theater

- Custom password hashing while Clerk exists
- A homemade encryption protocol
- IP allowlists that assume the owner’s home IP
- Storing backups on someone’s laptop
