# GroovGro agent operating rules

These rules apply to every Cloud Agent and every human working in this repository.

Product intent: [docs/MASTER_BRIEF.md](docs/MASTER_BRIEF.md) (V2). V1 brief: [docs/MASTER_BRIEF_V1.md](docs/MASTER_BRIEF_V1.md).  
Approved architecture (until superseded): [docs/phase-0/](docs/phase-0/) plus [docs/v2/ARCHITECTURE.md](docs/v2/ARCHITECTURE.md).  
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

- Phase 0 architecture is approved in `docs/phase-0/` (historical platform plan). Current product intent is [docs/MASTER_BRIEF.md](docs/MASTER_BRIEF.md) **v2.1**.
- V2 owner-assistance is on `main`: Business Brain, Offers, Goals, Next step, named shares, SEO checks, Search Console read-only, Brand Voice drafts. See [docs/STATUS.md](docs/STATUS.md) and [docs/v2/ARCHITECTURE.md](docs/v2/ARCHITECTURE.md).
- Keep working V1 features. The optional website builder stays in the app and is **paused** unless Jason asks to resume it. Do not rewrite working features to match a later phase number.
- SEO Intelligence, Content Engine, and AI Visibility / GEO are an approved **vision expansion**. They extend GroovGro. They are not a second app and not a clone of another SEO product. Status: MASTER_BRIEF §§15–19 and v2/ARCHITECTURE “Expansion”.
- Shared recommendations live on **`growth_actions`**. Do not create `growth_opportunities` unless a later review proves that table cannot hold them.
- Phase C first slice is implemented: existing Search Console + SEO findings can create recommend-only `growth_actions` for Next step and Intelligence. No new paid API. No content factory. No AI-platform scraping. No live-site edits.
- Phase B first slice is implemented: `growth_actions` can store title, evidence JSON, confidence, expected impact, and priority. Do not parse `description`. Do not use `priority` to reorder Next step until Jason asks.
- Phase D first slice is implemented: Business Brain can store who to reach, problems, known competitors, differentiators, and prohibited claims. Owner-entered only. Do not scrape competitors.
- Phase E first slice is implemented: Search Console queries already stored can become a keyword model with snapshot history. Do not buy keyword data.
- Phase F first slice is implemented: stored keyword history can receive a conservative estimate rank (worth a look / keep watching / not enough evidence). Do not treat that rank as search volume or a traffic forecast.
- Phase G first slice is implemented: the owner can save competitor notes they already know on SEO. Do not scrape search results, look businesses up, or buy a SERP vendor.
- Phase H first slice is implemented: worth-a-look Search Console queries can be compared to pages GroovGro already read. Do not invent topics, create a page, or scrape competitors.
- Phase I first slice is implemented: the owner can save a content brief to the SEO planner. Do not publish.
- Phase J first slice is implemented: GroovGro can write a workspace draft from a saved brief. Do not publish or change the live website.
- Phase K first slice is implemented: GroovGro can suggest internal links and estimate schema types from pages it already read. Do not add links or schema to the live website.
- Phase L first slice is implemented: the owner can save what they already heard from an AI system. Do not ask AI systems, scrape answers, or turn on a GEO adapter.
- Phase M first slice is implemented: the owner can save questions to a GEO query library. The adapter stays off. Do not ask AI systems or scrape answers.
- Do not mark later expansion work as implemented. Phases N–T (GEO measurement, publishing, execute) stay planned until Jason asks. Do not turn on SERP lookup or GEO lookup.
- Do not start ads, Growth Director execution, guarded automation, or autonomous AI.
- Do not scrape third parties in violation of their terms. Do not hard-code a fixed list of AI vendors through business logic.
- Search Console OAuth is read-only (`webmasters.readonly`). Do not request Ads or write scopes.
- The website builder must not overwrite a connected existing website or change Stripe checkout.
- Custom domains for GroovGro-built sites wait for a later slice.
- Do not change Ocean Sailing Adventures live Stripe checkout or **stripe-osa endpoint**.
- Brand voice drafts must not send email, post to social, edit a website, or take a payment.
- SEO checks and approved drafts must not edit the connected website. Title, description, and heading drafts may be applied to a **GroovGro-hosted** page after the user clicks Apply.
- Website apply model: suggest → user approves or rejects → apply only if an official connector exists (GroovGro builder, WordPress, or similar). Custom/code-hosted sites stay manual; show how and where to make the change. Do not silently rewrite a live site.
- Do not publish groovgro.com `robots.txt` or `sitemap.xml` for tenant builder pages.
- Do not auto-publish content. Do not present estimates as facts. Do not treat one AI answer as absolute truth.
