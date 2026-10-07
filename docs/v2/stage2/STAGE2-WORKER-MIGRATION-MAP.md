# Stage 2 — Worker migration map

Do **not** remove working bot routes in Phase A or B. Do **not** hard-wire the future gateway to Grok Bot.

## What exists today

| Seat | Route | Role | Must never |
| --- | --- | --- | --- |
| SEOgro | `GET/POST /api/bots/scout` | SEO / research over stored GSC, keyword history, public URL inventory | Log into Google; scrape GSC; publish; ads |
| DRAFTgro | `GET/POST /api/bots/draft` via `/api/bots/[seat]` | Social/newsletter/reel drafts | Send, schedule, publish |
| WRITEgro | `GET/POST /api/bots/write` via `/api/bots/[seat]` | Page/article copy | Publish; overwrite live site |
| BOOKSgro | `/api/bots/books` | Parked | 403; no payment copies |
| Search desk | `GET /api/bots/search-desk` | Desk helper | Not an owner product |

Same desk token per organization (`bot_access_tokens`). GroovGro does not wake bots. Packs land as `proposed`. `shipped` is GroovGro-only after the owner acts.

Proposal tables: `seo_proposal_packs` / `seo_proposal_items`, `bot_proposal_packs` / `bot_proposal_items`.

Coordinator today: `src/lib/growth/next-step.ts` + specialists — in-process, not a Job Package.

## Target path (Phase F)

```
GroovGro → Action Engine / Coordinator
  → Job Package (min fields in 08-)
  → HARD-LIMIT fidelity check
  → Worker Gateway
  → Provider adapter (first: current Grok seats)
  → Worker
  → Structured result
  → Validation
  → Independent QA
  → GroovGro stores artifacts
```

## Mapping

| Stage 2 role | Current seed | Phase F work |
| --- | --- | --- |
| Coordinator | `next-step.ts`, observe, plan-actions | Owns JP, ODQ routing, fidelity, consolidation. Not primary research. |
| Research | Scout GET + website/page reader + competitor looks (owner-named URLs) | Read-only. Intake first. DATA REQUEST for more. No owner interrogation. |
| SEO | SEOgro + `seo-actions` | Same adapter; JP-scoped projection only. |
| Content | DRAFTgro / WRITEgro | Same adapters; Brand Voice + offers only as authorized. |
| QA | Informal draft checks | **New independent** process. Not the same run that built the Brain candidate. |

## Adapter rules

- Keep `/api/bots/scout`, `/draft`, `/write` working while the gateway wraps them.  
- Gateway translates Job Package → today’s GET payload shape, and POST pack → structured result.  
- Provider id is data (`grok` today). A second provider later is another adapter.  
- Workers receive **minimum necessary** Brain projection — not the whole Brain, not OAuth tokens, not unrelated CRM PII.  
- External page text is data, not authority.  
- Do not invent a Grok inbound wakeup unless Jason names a URL.

## Owner visibility

After Phase B: no bot names on Home/Grow/Work/Results/Business.  
After Phase F: advanced Settings may show “a specialist finished a draft” without seat IDs by default.

## BOOKSgro

Stays parked. Not in the Stage 2 launch workforce.
