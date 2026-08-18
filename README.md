# GroMogia

Cloud-based modular business platform from Mogia Group. Connect the business. Understand the business. Grow the business.

**Live (Vercel):** [https://gro-mogia.vercel.app](https://gro-mogia.vercel.app)  
**Domain (later):** gromogia.com · **Parent:** mogiagroup.com

GitHub is the source of truth. Vercel is where the software runs. Cursor is development only.

## Current status

**Phase 1 — foundation.** Next.js app shell, organizations, roles, modules, brand settings, integrations list, audit log, and feature-flag tables.

Sign-in (Clerk) and the database (Neon) still need to be added on the Vercel project. Until then the public site works and the app shows what is missing.

| Doc | For |
| --- | --- |
| [Master brief](docs/MASTER_BRIEF.md) | Product vision |
| [Phase 0 architecture](docs/phase-0/README.md) | Approved plan |
| [Clerk + Neon setup](docs/phase-1/USER_SETUP.md) | What you do in Vercel |
| [Agent rules](AGENTS.md) | How Cloud Agents work |

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
```
