# GroovGro ↔ Grok Bot team

Authoritative roster and loop. Discard: Jason as permanent middleman; paste-forever as the UX; “do not build a live handoff unless asked”; the names SEO Scout, Draft Locker, and Books.

Current names: **SEOgro**, **DRAFTgro**, **BOOKSgro**.

Jason is the **Monday reviewer**. He marks what ships. He is not the long-term paste courier. Courier is only so both sides can learn the split. The product is GroovGro talking to the bots.

## Roster

| Seat | Role | Must never |
|---|---|---|
| **SEOgro** | SEO analyst. Reads data GroovGro provides. Returns proposal packs (suggestions, on-page title/meta/H1/briefs, technical recs). May fetch *public* pages/sitemaps and score them. Not a full crawler. Cannot see behind login. | Log into Google; own GSC/API; scrape GSC as source of truth; publish; apply live SEO; set `shipped`; social/email; ads spend |
| **DRAFTgro** | Drafts social, newsletters, reel scripts. Brand-labeled. Approval only. **Handoff later.** | Post, schedule, send, publish, ads, live SEO |
| **BOOKSgro** | QuickBooks: categorize, reconcile questions, simple reports. **Handoff later.** | File taxes; send invoices/payments; move money; invent balances; SEO/marketing |
| **dr eggbot** | Designs bots. Not in the GroovGro data loop. | — |

Do not mix brands. Property is a label on the pack (`mbss`, `osa`, `seamark` are current properties, not the only product types). Do not hard-code sailing as the product.

## GroovGro’s job

Pipe + applicator.

- Owns Search Console and any other logins/APIs the bots must not have.
- Pulls numbers. Inventories public URLs when a page list is stored.
- Sends that payload to SEOgro on `GET /api/bots/scout` (desk token).
- Receives SEOgro packs on `POST /api/bots/scout` as `proposed`.
- After Monday approve/reject, GroovGro is the applicator. Live CMS write stays **off** until that door is opened. Only GroovGro sets `shipped`, after a real apply.
- Later, may store DRAFTgro copy for approval. GroovGro is not the books of record unless Jason later says so.

## SEOgro loop (in scope)

1. GroovGro pulls Search Console (and URL inventory if stored) per property.
2. GroovGro sends that payload to SEOgro.
3. SEOgro writes proposal packs back (`status: proposed`).
4. Jason reviews Monday; marks approved / rejected.
5. GroovGro applies approved SEO when the site writer is on; sets `shipped` only after a real apply.
6. Next pull reflects reality.

Until a bot is pointed at the handoff, Jason may carry one sample payload. Treat every paste as a sample of that API, not as the product.

Do not block this loop on DRAFTgro or BOOKSgro.

## Proposal contract

- `property`: slug so brands are not mixed
- `source`: `gsc` and/or `public_pages`, plus a date range
- `items[]`: `{ id, type: suggestion | on_page_draft | technical, priority, evidence, draft?, status }`
- Status: SEOgro creates `proposed`. Jason (or GroovGro UI) sets `approved` / `rejected`. Only GroovGro sets `shipped`.

## Do not

- Keep Jason in the data path as a feature
- Ask SEOgro to publish or apply
- Let SEOgro log into Google
- Merge Google Ads optimization into this SEO loop
- Let DRAFTgro send
- Let BOOKSgro move money
- Mix the three brands
- Turn on live CMS write, ads, email send, or execute in this slice
