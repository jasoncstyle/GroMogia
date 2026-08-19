# Environment, secrets, and Cloud Agent setup

## Runtime

| Item | Value |
| --- | --- |
| Node | 22 (Cloud Agent VM already has this) |
| Package manager | npm (after Phase 1 adds `package.json`) |
| App port | 3000 |

## `.cursor/environment.json`

Committed at the repo root. Future agents will run `npm ci` once a lockfile exists. No secrets in this file.

After Phase 1, add a `terminals` entry for `npm run dev` if agents need a live app in the VM. Preview deployments remain the source of truth for “does it work on Vercel.”

## Cursor Cloud Agent secrets (development)

Add these in the Cloud Agent environment UI when Phase 1 starts — not in git.

Required for Phase 1:

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Required for Phase 2:

- `STRIPE_SECRET_KEY` (test)
- `STRIPE_WEBHOOK_SECRET` (test)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Optional later: `AI_GATEWAY_API_KEY`, Google/Meta OAuth client secrets.

## Vercel project env

Same names. Set separately for **Preview** (test keys, preview database) and **Production** (live keys, production database).

`NEXT_PUBLIC_APP_URL` should be `https://gro-mogia.vercel.app` until the custom domain is attached, then `https://groovgro.com`. Clerk and Stripe webhook endpoints must match.

## `.env.example`

Lists names only. Developers and agents copy names; values come from `vercel env pull` or Cloud Agent secrets.

## What does not belong in the Cloud Agent environment

- Production Stripe live keys (use test keys in agents)
- A production database writable by experimental agents (use a Neon branch or dedicated dev DB)
- Customer OAuth tokens from live Meta/Google accounts, until a dedicated sandbox org exists
