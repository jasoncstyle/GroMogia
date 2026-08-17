# GroMogia

Cloud-based modular business platform from Mogia Group. Connect the business. Understand the business. Grow the business.

**Domain:** [gromogia.com](https://gromogia.com) · **Parent:** [mogiagroup.com](https://mogiagroup.com)

GitHub is the source of truth. Vercel is where the software runs. Cursor is the development environment only.

## Current status

**Phase 0 — architecture and planning.** No application yet. Full product implementation waits for approval of [docs/phase-0/](docs/phase-0/).

| Doc | For |
| --- | --- |
| [Master brief](docs/MASTER_BRIEF.md) | Product vision and constraints |
| [Phase 0 index](docs/phase-0/README.md) | Architecture for review |
| [What you need to do](docs/phase-0/09-user-actions.md) | Account and Vercel steps |
| [Agent rules](AGENTS.md) | How Cloud Agents must work |

## Architecture in one line

You review in Cursor. A Cloud Agent develops on a branch. GitHub stores the code. Vercel Preview deploys that branch. Merging to `main` deploys production, which talks to hosted Postgres, Clerk, Resend, Stripe, and Blob.
