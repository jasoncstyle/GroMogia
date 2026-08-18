# GroMogia

Cloud-based modular business platform from Mogia Group. Connect the business. Understand the business. Grow the business.

**Live (Vercel):** [https://gro-mogia.vercel.app](https://gro-mogia.vercel.app)  
**Domain (later):** gromogia.com · **Parent:** mogiagroup.com

GitHub is the source of truth. Vercel is where the software runs. Cursor is development only.

## Current status

**Phase 2 — first real business data.** Sign in, connect an existing website, capture leads and customers as one contact record, add generic events, and sync Stripe bookings without storing card numbers.

| Doc | For |
| --- | --- |
| [Master brief](docs/MASTER_BRIEF.md) | Product vision |
| [Phase 0 architecture](docs/phase-0/) | Approved plan |
| [Clerk + Neon setup](docs/phase-1/USER_SETUP.md) | Sign-in and database |
| [Stripe + website setup](docs/phase-2/USER_SETUP.md) | Payments and tracking |
| [Agent rules](AGENTS.md) | How Cloud Agents work |

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
```
