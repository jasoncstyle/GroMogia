# Operating model

How GroovGro gets built and how it stays running.

## The important distinction

| Place | Job |
| --- | --- |
| Cursor Cloud Agent | Writes and tests code on a cloud machine |
| Cursor Desktop | You review, comment, and occasionally edit |
| GitHub | Permanent record of approved source |
| Vercel Preview | Running copy of a proposed change |
| Vercel Production | The live product, independent of any computer you own |
| Neon / Clerk / Stripe / Resend / Blob | Where data, identity, money, mail, and files live |

If your laptop and Cursor Desktop are shut down, production must keep serving customers.

## Day-to-day loop (after Vercel is connected)

1. You ask a Cloud Agent to do a slice of work (for example “Phase 1 foundation”).
2. The agent works on an isolated branch, not on `main`.
3. It commits, pushes, and opens a pull request.
4. Vercel builds a **Preview** URL for that PR. That is the always-deploy rule.
5. You review the PR (and the Preview) in GitHub / Vercel / Cursor.
6. You merge to `main`.
7. Vercel deploys **Production**.

The agent must not commit to `main` unless you explicitly say so.

## What “always deploy” means here

- Every reviewable change should produce a Vercel Preview from the pull request.
- Production deploys only from `main` after you merge.
- The agent does not wait for your computer to be online in order to deploy.

**Blocked today:** this GitHub repository is not connected to Vercel, and Vercel is not authenticated in this Cloud Agent. Phase 0 therefore cannot create a Preview URL. Connecting Vercel is the first action in [09-user-actions.md](09-user-actions.md).

## Secrets

- Never in git.
- Names live in `.env.example`.
- Values live in Vercel project env and Cursor Cloud Agent secrets.
- Preview uses test keys. Production uses live keys.

## Cloud Agent environment

A committed `.cursor/environment.json` tells future agents how to install dependencies after checkout. There is no `package.json` yet, so install is a no-op until Phase 1.

Secrets such as `DATABASE_URL` belong in the Cloud Agent environment **settings**, not in that JSON file.
