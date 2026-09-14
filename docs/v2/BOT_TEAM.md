# GroovGro ↔ Grok Bot team

Authoritative roster and loop. Discard: Jason as permanent middleman; paste-forever as the UX; the names SEO Scout, Draft Locker, and Books.

Current names: **SEOgro**, **DRAFTgro**, **WRITEgro**, **BOOKSgro**.

Jason is the **Monday reviewer**. He marks what ships. He is not the long-term paste courier. The product is GroovGro talking to the bots.

## Roster

| Seat | Role | Must never |
|---|---|---|
| **SEOgro** | SEO analyst. Reads data GroovGro provides. Returns proposal packs. May fetch *public* pages/sitemaps. Not a full crawler. Cannot see behind login. | Log into Google; own GSC/API; scrape GSC as source of truth; publish; apply live SEO; set `shipped`; social/email; ads spend |
| **DRAFTgro** | Drafts social, newsletters, reel scripts. Brand-labeled. Approval only. | Post, schedule, send, publish, ads, live SEO |
| **WRITEgro** | Writes page and article copy from saved brand, offers, voice, and briefs. Approval only. | Publish; overwrite a live site; send; ads; set `shipped` |
| **BOOKSgro** | Later. QuickBooks questions when GroovGro is closer to books. Not live. GroovGro will not send money facts or take a pack yet. | File taxes; send invoices/payments; move money; invent balances; SEO/marketing |
| **dr eggbot** | Designs bots. Not in the GroovGro data loop. | — |

Do not mix brands. Property is a label on the pack. Do not hard-code sailing as the product.

## GroovGro’s job

Pipe + store. Same desk token for every live seat.

| Seat | Read / write |
|---|---|
| SEOgro | `GET/POST /api/bots/scout` (includes stored Search Console, keyword history / worth-a-look labels, and public URL inventory) |
| DRAFTgro | `GET/POST /api/bots/draft` |
| WRITEgro | `GET/POST /api/bots/write` |
| BOOKSgro | Parked. `GET/POST /api/bots/books` returns 403. GroovGro does not send payment copies. |

GroovGro does not call the bots yet. Each bot GETs its payload and POSTs a pack as `proposed`. Live CMS write, email send, social post, and QuickBooks write stay **off**. Only GroovGro sets `shipped` after the owner acts.

## Do not

- Keep Jason in the data path as a feature
- Ask a bot to publish, send, or apply
- Let SEOgro log into Google
- Install OpenSERP or scrape Google / Bing search results
- Let DRAFTgro send
- Let WRITEgro publish
- Turn on BOOKSgro or send money facts before the owner asks
- Let BOOKSgro move money or invent balances
- Mix brands
- Turn on live CMS write, ads, email send, or execute in this slice
