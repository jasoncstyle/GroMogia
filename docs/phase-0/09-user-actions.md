# What you need to do

Most GroMogia work will be done by Cloud Agents after you approve this architecture. These steps need **you**, because they involve accounts, billing, and DNS.

You do **not** need to keep a development computer running for production. You do **not** need to paste the master brief again; it is in `docs/MASTER_BRIEF.md` on this branch.

## Do now (before or while you review this PR)

### 1. Review and approve this architecture

Read the Phase 0 docs, then reply on the pull request or in Cursor: approve, or list changes.

### 2. Connect GitHub → Vercel (required for “always deploy”)

Until this exists, no Preview or Production URL can be created.

1. Sign in at [vercel.com](https://vercel.com) with the GitHub account that owns `jasoncstyle/GroMogia`.
2. **Add New Project** → import `GroMogia`.
3. You can import it now even though there is no Next.js app yet. After Phase 1, Vercel will build automatically.
4. In Cursor: authenticate the Vercel integration / MCP so Cloud Agents can inspect deployments.

Production should deploy from `main` only. Preview should deploy from every pull request.

### 3. Authenticate Vercel inside Cursor

This Cloud Agent run could not use the Vercel tools (`needsAuth`). In Cursor Desktop, connect the Vercel MCP / account for this repo so the next agent can attach Preview URLs to its work.

## Do after you approve Phase 0, before Phase 1 coding finishes

### 4. Create (or reuse) hosted accounts

Use Vercel Marketplace where possible so env vars are injected for you:

| Service | Purpose | Notes |
| --- | --- | --- |
| Neon | Postgres | Marketplace: `vercel integration add neon` after the project is linked |
| Clerk | Sign-in | Marketplace: `vercel integration add clerk` |
| Stripe | Payments / later SaaS billing | Test mode for Preview; live later |
| Resend | Transactional email | Verify `gromogia.com` when you are ready to send |

You already use Stripe and Resend elsewhere. Create **GroMogia-specific** test keys rather than mixing Ocean Sailing Adventures live keys into this app.

### 5. Save Cloud Agent environment secrets

When Phase 1 has a database and Clerk instance, add the names in [07-environment-and-secrets.md](07-environment-and-secrets.md) to the Cloud Agent environment secret store. Never put the values in chat or in git.

### 6. Confirm the first test business

Recommended: **Ocean Sailing Adventures**, using the existing Stripe booking system as the first adapter — generalized, not sailing-hardcoded.

Tell the agent if that is wrong.

## Do later (not required to approve Phase 0)

### 7. DNS for gromogia.com

When there is an app to show:

- `gromogia.com` → Vercel (marketing)
- `app.gromogia.com` → Vercel (product)

Clerk allowed origins and Stripe webhook URLs will need those hostnames.

### 8. Keep SiteGround sites where they are

Do not migrate WordPress off SiteGround for GroMogia to work. Phase 2 connects them.

### 9. Merge this PR when you are happy

Merging puts the brief and architecture on `main`. That is documentation only; it does not launch a product.

## What you should not do

- Do not install Postgres, Stripe CLI tunnels, or the app as a permanent process on your home computer.
- Do not put API keys in the GitHub repo (it is public).
- Do not ask the next agent to build the website builder, ads manager, or autonomous AI before Phases 1–2 exist.
- Do not treat Cursor Desktop as a server.
