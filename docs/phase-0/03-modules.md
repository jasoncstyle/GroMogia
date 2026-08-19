# Major modules

Modules are independently enabled capabilities. The codebase may contain a module before an organization is entitled to it. Navigation, APIs, jobs, and billing all key off entitlements.

## Platform (always on, not sold)

| Module | Purpose |
| --- | --- |
| `core` | Organizations, users, memberships, RBAC, settings |
| `flags` | Feature flags (Mogia Group, beta, plan, org) |
| `audit` | Append-only audit log |
| `notifications` | In-app + email notification bus and preferences |
| `platform-admin` | Mogia Group super-admin surface (not an org module) |

## Organization modules (entitled)

| ID | Name | First useful phase | Notes |
| --- | --- | --- | --- |
| `brand` | Brand management | 1 | Central name, logo, colors, contact, locations |
| `integrations` | Integration framework | 1 | Connect / status / disconnect; adapters added over time |
| `website_connect` | Connect existing website | 2 | SiteGround, WordPress, or any URL + tracking |
| `website_builder` | GroovGro website builder | 7 | Section-based; optional; not required for other modules |
| `events` | Events and calendar | 2 if the test business needs it | Generic engine; industry templates configure it |
| `crm` | Leads and customers | 2 | Shared contact identity (see data model) |
| `commerce` | Bookings / purchases / Stripe | 2 | Adapter to existing OSA Stripe booking; not a new Stripe |
| `marketing` | Campaigns and channels | 3 | Ads, email, social as adapters |
| `analytics` | Cross-system analytics | 2 (basic), 3 (attribution) | Not a GA clone |
| `seo` | SEO | 6 | Independent module |
| `social` | Social publishing | 8 | After brand voice exists |
| `reviews` | Reputation | 8 | Official APIs only |
| `intelligence` | Mogia intelligence | 4 | Reads other modules; does not replace them |
| `brand_voice` | Brand voice / content | 5 | Approved examples only |
| `billing` | SaaS subscriptions | 10 | Stripe Billing for GroovGro itself |
| `media` | Media library | 1 (stub), used by all later | Vercel Blob, tenant-keyed |

## Entitlement rules

- An organization has a set of enabled module IDs.
- Navigation renders only enabled modules.
- Route handlers and jobs return 404/403 if the module is not enabled.
- Dashboard widgets register against a module ID and disappear when it is off.
- Billing (later) maps plans → module sets. Until commercialization, Mogia Group orgs can be flagged on.

## Coupling rules

Allowed:

- `crm` and `commerce` both reference `contacts`
- `analytics` reads canonical records from other modules
- `intelligence` reads those records and `brand_voice`
- `website_builder` and `website_connect` both produce a `websites` row
- `events` can optionally publish onto a connected or built website

Forbidden:

- Requiring `website_builder` to use `crm`, `seo`, or `events`
- Sailing-specific tables
- Calling Stripe or Resend from random UI files instead of adapters
- Storing GA/Meta payloads as the system of record (store canonical facts, keep raw payloads optional)

## Dashboard composition

The shell is always present (Phase 1). Widgets are contributed by enabled modules and must answer: what is happening, why, what needs attention, what to do next — not a chart wall.
