# GroovGro agent operating rules

These rules apply to every Cloud Agent and every human working in this repository.

Product intent: [docs/MASTER_BRIEF.md](docs/MASTER_BRIEF.md).  
Approved architecture (until superseded): [docs/phase-0/](docs/phase-0/).  
Current checkpoint: [docs/STATUS.md](docs/STATUS.md).

The product is **GroovGro** (domain groovgro.com). The GitHub repository may still be named GroMogia until it is renamed on GitHub.

## Cloud-first

- Develop GroovGro with Cursor Cloud Agents for substantial work.
- GitHub is the source of truth.
- Do not create any production dependency on a local computer.
- A local computer may be used for review, testing, debugging, or occasional development. Production must keep running when that computer and Cursor Desktop are shut down.
- Cursor Cloud is where software is developed. Vercel, Neon, Clerk, Resend, Stripe, and similar hosted services are where finished software operates. Cursor must never become part of the production architecture.

## Git and review

- Use isolated branches for significant work. Do not commit directly to `main` unless explicitly instructed.
- Create reviewable commits with clear messages.
- Open or update a pull request for the working branch.
- Merge to `main` only after human approval.

## Deploy always

- After Vercel is connected to this GitHub repository, every reviewable change should produce a Vercel Preview deployment from the pull request.
- Production deploys happen from `main` after merge, not from Cloud Agent branches.
- Do not wait for a local machine to be online in order to deploy.

## Secrets

- Never store secrets in source control. This repository is public.
- Configure development secrets and environment variables in Cursor Cloud Agent environment settings and in Vercel project environment settings.
- Commit only `.env.example` with names, never values.

## Architecture constraint

- Before implementing a component, check whether it would require a local computer to remain online. If it would, replace it with a cloud-hosted solution.
- Keep a modular monolith. Do not add microservices, native apps, or unrestricted AI automation unless the current approved phase says so.
- Do not hard-code sailing businesses or organization IDs. Generalize (events, not sailing classes).
- Never store payment card data. Never scrape third parties in violation of their terms.

## Phase gate

- Phase 0 architecture is approved in `docs/phase-0/`.
- Current implementation phase is **Phase 6 SEO** (homepage check, approve/reject drafts, monitoring, plain-language explanation). See [docs/STATUS.md](docs/STATUS.md).
- Do not skip ahead to the website builder, ads, Search Console OAuth, or autonomous AI.
- After Phase 6, wait for human approval before Phase 7 (website builder).
- Do not change Ocean Sailing Adventures live Stripe checkout or **stripe-osa endpoint**.
- Brand voice drafts must not send email, post to social, edit a website, or take a payment.
- SEO checks and approved drafts must not edit the connected website.
- Website apply model: suggest → user approves or rejects → apply only if an official connector exists (GroovGro builder, WordPress, or similar). Custom/code-hosted sites stay manual; show how and where to make the change. Do not silently rewrite a live site.
