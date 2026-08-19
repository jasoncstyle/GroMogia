# Data model and tenant isolation

Postgres (Neon) is the system of record. Shared schema, every tenant row stamped with `organization_id`, Row Level Security as defense in depth.

Do not use one database per customer in v1. Do not use one Postgres schema per customer in v1. Those choices are hard to operate with a small team and fight Neon + serverless connections.

## Isolation rules

1. Every tenant-owned table has `organization_id` (UUID, FK to `organizations`, indexed).
2. Application queries **must** go through a scoped DB helper that injects `organization_id` from the session. Ad-hoc queries that omit it are a defect.
3. Enable Postgres RLS policies `USING (organization_id = current_setting('app.organization_id')::uuid)` on tenant tables. Set that setting per request after auth.
4. Platform-admin queries use a separate, audited path and never run in an org session.
5. Blob keys are prefixed `org/{organization_id}/...`.
6. AI context, audit, notifications, integrations, and billing are organization-scoped.
7. Users are global people. Access is via `memberships`. A user can belong to many organizations.

## Identity: contacts, not duplicate lead/customer rows

The brief says avoid duplicating information between leads and customers. Phase 1/2 should use:

- `contacts` — the person or business contact (email/phone/name unique **per organization**)
- `lead_records` — pipeline state, assignment, estimated value (1:1 or 1:current with a contact)
- `customers` — customer state, first converted at, LTV cache (1:1 with a contact)

A won lead does not copy the person into a second table of names and emails. It marks the contact as a customer and keeps the lead record for attribution history.

Lead **stages** are rows (`lead_stages`) per organization, seeded with New / Contacted / Qualified / Proposal / Won / Lost, not hardcoded enums.

## Phase 1 schema (create in Phase 1)

### `organizations`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| slug | citext unique | URL-safe |
| name | text | |
| status | text | `active`, `suspended` |
| created_at, updated_at | timestamptz | |

### `users`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | GroovGro user id |
| clerk_user_id | text unique | Clerk subject |
| email | citext | Cached from Clerk |
| name | text | Cached |
| created_at, updated_at | timestamptz | |

### `memberships`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| organization_id | uuid | |
| user_id | uuid | |
| status | text | `invited`, `active`, `revoked` |
| created_at, updated_at | timestamptz | |
| unique (organization_id, user_id) | | |

### `permissions`

Seeded catalog: `manage_website`, `publish_website`, `manage_seo`, `manage_advertising`, `manage_social`, `view_analytics`, `manage_leads`, `manage_customers`, `manage_events`, `manage_integrations`, `manage_billing`, `manage_users`, `approve_ai_actions`, `view_financials`, `manage_platform`, …

### `roles`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| organization_id | uuid nullable | `null` = system role template |
| key | text | `owner`, `admin`, `marketing_manager`, … |
| name | text | |
| is_system | boolean | System templates cloned per org |

### `role_permissions` — role_id, permission_id  
### `membership_roles` — membership_id, role_id

Platform Super Admin is **not** an org role. Use `users.platform_role = 'super_admin'` (or a `platform_admins` table). Never grant `manage_platform` inside an organization.

### `modules` — id (`brand`, `crm`, …), name, description, phase_introduced  
### `organization_modules` — organization_id, module_id, status (`enabled`/`disabled`), source (`flag`/`plan`/`manual`)

### `feature_flags`

| Column | Type | Notes |
| --- | --- | --- |
| key | text pk | |
| description | text | |
| enabled_globally | boolean | |
| enabled_for_platform | boolean | Mogia Group |

### `organization_feature_flags` — organization_id, flag_key, enabled

### `brand_settings` (1:1 organization)

Business name, logo_asset_id, colors JSON, fonts JSON, description, target_customers, terminology JSON, contact JSON, social profile URLs. Locations in `brand_locations`.

### `integration_providers` — key (`stripe`, `resend`, `wordpress`, …), capabilities JSON  
### `integration_connections`

| Column | Type | Notes |
| --- | --- | --- |
| organization_id | uuid | |
| provider_key | text | |
| status | text | `connected`, `error`, `disconnected` |
| scopes | text[] | |
| secret_ref | text | Pointer to encrypted secret store, **not** the token |
| expires_at | timestamptz | |
| last_sync_at | timestamptz | |
| last_error | text | |

OAuth tokens and API keys are stored encrypted (see [05-auth-security.md](05-auth-security.md)), never in a plaintext column.

### `audit_events`

Append-only: organization_id (nullable for platform events), actor_user_id, action, target_type, target_id, metadata JSON, ip, created_at. No updates.

### `notifications`

organization_id, user_id, type, title, body, href, read_at, email_sent_at, created_at.

### `notification_preferences` — user_id, organization_id, type, in_app, email

### `media_assets`

organization_id, blob_pathname, content_type, byte_size, checksum, kind (`logo`/`image`/`document`), created_by, created_at.

### `ai_action_logs` (stub in Phase 1, used from Phase 4)

organization_id, level (1–5), action_type, input_summary, output, status (`observed`/`recommended`/`drafted`/`approved`/`executed`/`rejected`), actor_user_id, approved_by, created_at.

## Phase 2 schema (first real business data)

### `websites`

organization_id, kind (`connected` | `built`), public_url, provider (`siteground` | `wordpress` | `groovgro` | `other`), tracking_id, status.

### `contacts`

organization_id, display_name, email, phone, unique (organization_id, email) where email is not null.

### `lead_stages` — organization_id, key, name, sort_order, is_won, is_lost  
### `lead_records` — contact_id, stage_id, source, campaign_id, landing_page, form_id, assigned_user_id, estimated_value, notes, converted_at  
### `lead_activities` — lead_id, type, body, actor_user_id, created_at  
### `customers` — contact_id unique, first_converted_at, ltv_cents, marketing_source

### `attribution_touches`

organization_id, contact_id nullable, session_id, occurred_at, channel, campaign_id, landing_page, referrer, raw JSON. This is the spine for Phase 3.

### `events`

organization_id, title, description, event_type (generic string), location, starts_at, ends_at, capacity, price_cents, currency, registration_url, featured_asset_id, visibility (`public`/`private`), status. Recurrence in a later migration.

### `bookings`

organization_id, contact_id, event_id nullable, external_provider (`stripe` | `groovgro` | …), external_id, starts_at, status, source, campaign_id.

### `payments`

organization_id, booking_id nullable, contact_id, provider (`stripe`), provider_object_id, amount_cents, currency, kind (`charge`/`deposit`/`refund`), status. **No PAN, no CVC, no magnetic stripe data.**

## Later tables (do not create in Phase 1)

Campaigns, ad spend snapshots, SEO audits, brand_voice_profiles, brand_voice_examples, reviews, website_pages, website_sections, SaaS subscription items. Add when that phase starts so the schema stays honest.

## Naming

- Prefer `organization_id` everywhere (not `tenant_id`, not `account_id`).
- Money as integer cents + currency.
- Timestamps in UTC (`timestamptz`).
- Soft-delete only where history matters (`deleted_at`); audit_events are never deleted.

## First test data (not hardcoded)

Ocean Sailing Adventures should be **seed/fixture data** or a real connected org after Phase 2, never `if (orgId === 'osa')` in application code. Sailing class calendars are `events` with a template, not `sailing_classes`.
