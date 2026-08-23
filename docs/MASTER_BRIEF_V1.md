# GroovGro — Project Master Brief

Source of truth for product intent. Architecture and implementation must follow this document unless a later approved decision supersedes it.

**Product:** GroovGro (formerly GroMogia)  
**Parent company:** Mogia Group  
**Product domain:** groovgro.com  
**Parent domain:** mogiagroup.com  

**MOGIA:** Marketing · Operations · Growth · Intelligence · Analytics

---

## 1. Vision

Build GroovGro as a professional, cloud-based, modular business management, marketing, website, automation, analytics, and AI platform.

GroovGro should help a business connect the systems it already uses, optionally build and manage its website, manage marketing, capture and understand leads, manage customers, analyze business performance, and use AI to recommend and eventually automate actions that improve the business.

**CONNECT THE BUSINESS. UNDERSTAND THE BUSINESS. GROW THE BUSINESS.**

GroovGro should not simply become another website builder, CRM, marketing platform, or analytics dashboard. Its primary value comes from connecting these functions and understanding the relationships between them.

Example journey:

Website → Traffic → Marketing Source → Lead → Customer → Booking / Purchase → Payment → Revenue → Review → Repeat Customer

The platform should eventually understand that entire journey and answer questions such as:

- Which marketing campaigns actually create paying customers?
- Which website pages generate the best leads?
- Which advertising channels generate the most revenue?
- What marketing should the business increase or reduce?
- What SEO opportunities exist?
- What website changes could increase conversions?
- Which leads are most valuable?
- Which customers may return?
- Which business activities are producing measurable growth?
- What has changed recently?
- What problems need attention?
- What should the business owner do next?

Eventually GroovGro should move beyond reporting and recommendations and, with appropriate user permissions, assist with or automate selected actions.

## 2. Modular product

A customer must not be required to use every GroovGro feature.

Examples:

- Customer A: website builder + SEO + marketing + CRM + analytics
- Customer B: already has WordPress; wants analytics, marketing, leads, and AI
- Customer C: advertising management and reporting only
- Customer D: website management and SEO only
- Customer E: external booking platform connected to GroovGro
- Customer F: events/calendar but not the website builder

Database, permissions, navigation, billing, and application structure must treat modules as independently enabled. Do not tightly couple modules unnecessarily.

## 3. Multi-tenant architecture

GroovGro is a commercial SaaS product and must be multi-tenant.

| Term | Meaning |
| --- | --- |
| Organization | Customer / business account |
| User | Person with access to an organization |
| Module | GroovGro capability enabled for an organization |
| Integration | External service connected by an organization |

One user may belong to multiple organizations.

Every organization must have isolated: users, roles, websites, customers, leads, marketing data, integrations, analytics, AI context, brand voice, files/assets, events, settings, billing, and audit history.

Tenant isolation is a critical security requirement.

## 4. Roles and permissions

Flexible role-based access. Initial roles may include:

- Platform Super Admin
- Organization Owner
- Organization Admin
- Marketing Manager
- Website Manager
- Sales / Lead Manager
- Staff
- Viewer

Do not hard-code the application around only these roles. Permissions must be granular and extensible.

Example permissions: manage website, publish website, manage SEO, manage advertising, manage social, view analytics, manage leads, manage customers, manage events, manage integrations, manage billing, manage users, approve AI actions, view financial/revenue information.

## 5. Main dashboard

The dashboard must not become a wall of meaningless charts. It answers:

- What is happening?
- Why is it happening?
- What needs attention?
- What should I do next?

Potential sections (shown only when the matching module is enabled): business overview, website, marketing, leads, customers, bookings/sales, revenue, SEO health, reviews, upcoming events, tasks/recommendations, AI insights, alerts, recent changes.

## 6. Website builder

Optional professional website builder: templates + reusable sections + visual customization.

Do not start with an unrestricted free-form canvas. Start with professionally designed responsive sections that users can add, remove, reorder, and customize.

Section examples: hero, text, image + text, gallery, testimonials, features, services, pricing, team, FAQ, contact, lead form, newsletter, CTA, map, events, calendar, booking, reviews, blog/news, custom content.

Editable without coding: text, images, spacing, backgrounds, fonts, brand colors, buttons, links, section order, visibility.

Websites must be responsive, fast, SEO-friendly, accessible, and secure.

A business must also be able to connect an existing website rather than using GroovGro’s builder.

**How GroovGro applies website changes**

- Suggest → the user approves or rejects → apply only when a real connector allows it.
- GroovGro website builder, WordPress, or a similar official API: approved updates can be applied automatically later.
- Custom or code-hosted sites: GroovGro drafts the change and shows how and where to apply it. The owner updates the site manually.
- Daily jobs may re-check and suggest. They must not rewrite the live site overnight.
- Say this in onboarding and, when public signup exists, in the features section. The public homepage stays Coming soon until commercialization.

## 7. Industry-specific website modules

Support optional industry modules (for example sailing schools/clubs) on top of a **generic** event system. Do not make the database sailing-specific.

Generic events can represent classes, seminars, tours, workshops, club events, training, appointments, open houses, meetups, and special events. Industry templates configure the generic engine.

Event fields may include: title, description, type, location, start/end, capacity, price, registration link, featured image, visibility, status.

## 8. SEO system

Independent module: audit, titles, meta, headings, canonicals, structured data, sitemap, robots, alt text, internal links, broken links, redirects, performance, keywords, content recommendations, local SEO, Search Console, Google Business Profile where APIs permit.

AI should explain recommendations in plain language. Selected changes may later be applied automatically with permission.

## 9. Marketing

Core capability. Eventually: Google Ads, Meta/Facebook Ads, Instagram, social, email, campaign planning, content, tracking, attribution.

Marketing must not exist in isolation. Connect campaign → click → visitor → lead → customer → booking/purchase → revenue. Long-term goal is business-level attribution, not vanity metrics.

## 10. Social media

Future: post creation, AI writing, media, calendar, scheduling, campaign organization, performance, recommendations. Networks: Facebook, Instagram, others where APIs permit. Follow each platform’s API policies.

## 11. Brand voice

Each organization has a Brand Voice Profile learned from **approved** examples (website copy, social, email, ads, blog, samples). Structured preferences: tone, sentence length, formality, vocabulary, phrases to avoid, CTA style, emoji, humor, technical depth, audience, personality, good/bad examples.

Users can say: more like this, less like this, never use this phrase, this sounds like us, this does not.

Do not blindly train from everything a business has ever written.

## 12. Lead management

Lightweight CRM. Fields may include name, email, phone, source, campaign, landing page, form, date, status, notes, assigned user, tags, estimated value, conversion status.

Default stages: New, Contacted, Qualified, Proposal, Won, Lost — ultimately customizable.

Maintain attribution whenever possible: where did this lead come from, and did it become revenue?

## 13. Customer management

Converted leads become customers. Profiles may include contact info, history, bookings, purchases, payments, communications, notes, tags, marketing source, lifetime value, reviews, activities.

Avoid duplicating information unnecessarily between leads and customers.

## 14. Bookings / commerce

Integrate existing booking systems. An existing Stripe-based booking system for Ocean Sailing Adventures is an early integration/test case.

Potential records: booking, customer, product/service, dates, capacity, payments, deposits, balances, refunds, source, campaign attribution.

Do not rebuild Stripe. Never store payment card data.

## 15. Events and calendar

Optional generic events module: calendar/list views, event pages, categories, capacity, pricing, registration links, recurring events, private/public, featured, filters, website integration.

## 16. Reviews / reputation

Aggregate or reference reviews from authorized third-party sources (Google, Facebook, TripAdvisor, others) **using official APIs only**. No scraping in violation of terms.

Capabilities: monitoring, notifications, analytics, testimonial approval, website display, sentiment, response drafting. Users approve responses unless later automation permissions are configured.

## 17. Analytics

Do not merely reproduce Google Analytics. Combine website, SEO, Search Console, GA, ads, social, email, leads, customers, bookings, Stripe, events, and reviews.

Connect activity to outcomes (spend → visitors → leads → customers → revenue), not vanity metrics.

## 18. Mogia intelligence layer

AI operates across GroovGro, not as a bolted-on chatbot. It should understand organization, brand voice, website, marketing, SEO, customers, leads, analytics, events, history, and integrations.

Capabilities: summarize, detect anomalies, identify opportunities, explain analytics, generate content, recommend campaigns/SEO/website changes, draft communication, compare periods, suggest next actions, answer natural-language questions with evidence.

## 19. AI action / automation model

| Level | Name | Behavior |
| --- | --- | --- |
| 1 | Observe | Analyze only |
| 2 | Recommend | Recommend actions |
| 3 | Draft | Prepare changes; require approval |
| 4 | Approved automation | Execute specifically authorized classes of actions |
| 5 | Autonomous rules | Predefined low-risk activities within organization-defined rules |

Do not allow unrestricted AI modification of customer systems. Log AI actions and approvals.

## 20. Third-party integrations

Clean integration framework with provider adapters.

Known services: Vercel, SiteGround, Resend, GitHub, Stripe, Expo.

Future: Mailchimp, Google Analytics, Search Console, Google Ads, Google Business Profile, Meta, Facebook, Instagram, TripAdvisor, Square, other CRMs, booking platforms, calendars, email providers.

Do not tightly couple the internal data model to one vendor.

## 21. Existing infrastructure

| System | Role |
| --- | --- |
| Vercel | Primary candidate for app hosting |
| SiteGround | Existing WordPress/web hosting; some sites stay there and connect |
| GitHub | Source control |
| Stripe | Payments, subscriptions, booking payments, SaaS billing |
| Resend | Transactional email |
| Expo | Native mobile later, if required |

Production must operate in the cloud. Cursor is the development environment, not the production server.

## 22. Cloud architecture

Cloud-native. The developer’s computer is only for local development. Production continues when that computer is off.

Use appropriate cloud services for hosting, database, auth, files, background jobs, scheduled jobs, webhooks, AI, email, monitoring, and logging.

Do not assume Vercel must perform every function. Prefer managed services for a small team.

## 23. Background jobs

Examples: SEO scans, analytics imports, ad/social/review sync, scheduled posts/emails, AI analysis, summaries, integration refresh, webhook processing.

Jobs must run in cloud infrastructure. Design them to be retryable, idempotent where appropriate, observable, logged, and failure-aware.

## 24–25. Security

Foundational: authentication, authorization, tenant isolation, encrypted secrets, secure credential storage, CSRF/XSS/SQL injection protections, rate limiting, secure webhooks, audit logs, least privilege, environment separation, input validation, dependency monitoring, backups.

Never expose API keys, Stripe secrets, OAuth tokens, or database credentials to client-side code.

OAuth where supported. Users can connect, see status and permissions, refresh/reconnect, and disconnect. Store tokens securely. Track provider, organization, status, scopes, expiration, last sync, errors.

## 26. Audit log

Record important actions early: invites, role changes, publishes, SEO/campaign changes, integration connect/disconnect, AI approvals and executions, customer changes, billing changes.

## 27. Notifications

Centralized: in-app, email, future push. Examples: new lead, booking, payment, failed integration, SEO issue, campaign anomaly, review, event registration, AI recommendation, system alert. Users eventually configure preferences.

## 28. File / media library

Tenant-isolated library for logos, brand images, website images, social assets, documents, campaign assets. Cloud object storage.

## 29. Brand management

Central brand settings: name, logo, colors, fonts, contact, locations, social profiles, brand voice, description, target customers, services/products, approved imagery, terminology. Other modules reference this rather than duplicating it.

## 30. Onboarding

Adaptive: create organization → business info → brand → select modules → connect or create website → connect Google/Meta/Stripe/email → import → brand voice → invite team → dashboard.

## 31. Billing / subscriptions

Design for later commercial billing: base subscription + optional modules + usage where appropriate. Do not finalize pricing yet. Stripe is the preferred billing platform. The system must know which modules an organization is entitled to use.

## 32. Mogia Group administration

Separate platform admin: organizations, subscriptions, health, integration failures, templates, modules, feature flags, support, usage, announcements, AI config, global settings. Never expose this to normal organization users.

## 33. Feature flags

Enable experimental features for Mogia Group, test orgs, beta customers, specific plans, or all customers. Mogia Group businesses are the first real-world test environment.

## 34. Internal test businesses

Use Mogia Group businesses as real test cases (websites, marketing, customers, bookings, Stripe, events, content, analytics, SEO).

Do not hard-code GroovGro around sailing. Generalize into reusable commercial functionality (for example “Events Module” with a sailing template, not a sailing-only calendar).

## 35. Development philosophy

Do not build the entire platform simultaneously. Prioritize correct architecture, maintainability, security, modularity, testing, documentation, UX, and scalability.

Avoid premature complexity and unnecessary microservices. A well-structured modular monolith is preferred initially.

## 36. Code quality

TypeScript, clear naming, modular architecture, reusable components, strong typing, validation, consistent errors, structured logging, tests for critical logic, migrations, documented env vars, README, API docs where appropriate.

Avoid huge files, duplicated logic, hard-coded organization IDs or secrets, vendor logic spread throughout the app, unnecessary dependencies.

## 37. UI / UX

Professional but approachable. Target: small and medium-sized business owners who may not be technical.

Avoid jargon and overwhelming dashboards. Use plain English, explain recommendations, make setup easy, show status, offer contextual help, use progressive disclosure. Mobile responsive.

## 38. Initial development priorities

| Phase | Focus |
| --- | --- |
| 1 | Foundation: architecture, DB, auth, orgs, users, roles, modules, nav, dashboard shell, settings, brand, integrations, audit, notifications, feature flags |
| 2 | First real business data: website connection, Stripe, leads, customers, basic analytics, events if useful |
| 3 | Marketing / attribution: campaign → lead → customer → revenue |
| 4 | Intelligence: summarize, explain, compare, detect, recommend on real data |
| 5 | Brand voice / content |
| 6 | SEO |
| 7 | Website builder (after the core platform proves useful) |
| 8 | Additional integrations |
| 9 | Controlled automation |
| 10 | Commercialization: plans, public signup, onboarding, support |

## 39. Critical design principle

GroovGro should not merely display data. It should create understanding.

- Bad: “Google Ads clicks increased 17%.”
- Better: “Google Ads clicks increased 17%, but leads remained flat.”
- Best: evidence-based explanation plus a next action.

Guide the product with: **DATA → CONTEXT → INSIGHT → RECOMMENDATION → ACTION**.

## 40. Do not do yet

Do not: build every feature at once; build native mobile apps; create unnecessary microservices; implement unrestricted AI automation; rebuild Stripe; store card data; hard-code sailing-specific functionality; lock to one website, email, or ads provider; create an unrestricted drag-and-drop canvas; spend significant time on cosmetics before core architecture works.

## 41. First task (Phase 0)

Before substantial production code: review this specification; inspect the repository; identify stack and existing functionality; do not delete working functionality without understanding it; propose technical architecture, stack, modules, schema, tenant isolation, auth, integrations, jobs, AI, deployment, folder structure, security, phased roadmap, expensive-to-change decisions, and anything in this specification that should change before development.

**Stop after architecture and planning. Present it for review and approval.**

## 42. Long-term product goal

GroovGro should become the intelligent operating layer connecting the digital side of a small or medium-sized business. It does not need to replace everything the customer already has.

**CONNECT → COLLECT → UNDERSTAND → RECOMMEND → ACT → LEARN → IMPROVE**

Build the foundation with that vision while keeping the initial implementation simple, modular, secure, and maintainable.
