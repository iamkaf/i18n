# i18n.kaf.sh — TODO

## Guardrails

- [ ] Keep copy and UX framed as an atelier for Kaf's mods (not SaaS/platform language)
- [ ] Reject scope that implies multi-tenant/org-management behavior

## Setup

- [x] Fill `.dev.vars` with real Discord app credentials + 32-byte hex `SESSION_SECRET`
- [x] Register Discord OAuth2 app; add redirect URIs:
  - `https://i18n.kaf.sh/api/auth/callback`
  - `http://localhost:3000/api/auth/callback`
- [x] `wrangler d1 migrations apply i18n --remote`
- [x] `wrangler secret put DISCORD_CLIENT_ID`
- [x] `wrangler secret put DISCORD_CLIENT_SECRET`
- [x] `wrangler secret put SESSION_SECRET`
- [x] Support a singleton hardcoded `god` user by Discord ID
- [ ] Seed additional trusted moderator Discord IDs as needed
- [ ] Create at least one API token (`npm run token:new`)

## Pages

- [x] Project browser (`/projects`)
- [x] Unified project workbench (`/projects/[slug]`)
- [x] Project-level string browsing, progress, and suggestion composer
- [x] Contributor history route (`/suggestions`)
- [x] Moderator queue route (`/moderation`)
- [x] God-only user management route (`/users`)

## Backend

- [x] `PATCH /api/suggestions/[id]` — edit pending suggestion (author only)
- [x] `DELETE /api/suggestions/[id]` — withdraw pending suggestion (author only)
- [x] `GET /api/projects` — list projects (public visibility)
- [x] `GET /api/projects/[slug]` — project detail
- [x] `GET /api/projects/[slug]/strings` — paginated project-scoped source strings
- [x] `GET /api/projects/[slug]/progress` — project-scoped translation coverage per locale
- [x] `GET /api/projects/[slug]/imports/discovery` — GitHub locale-file discovery
- [x] `POST /api/projects/[slug]/imports` — import canonical source or approved translations
- [x] `GET /api/suggestions` — filtered suggestion lists for contributors and moderators
- [x] `GET /api/export/[project]/[locale]` — project-level export with English fallback
- [x] `GET /api/users` — god-only elevated-user listing
- [x] `PATCH /api/users/[discordId]` — god-only role updates by Discord ID
- [x] `DELETE /api/users/[discordId]` — god-only demotion by Discord ID
- [x] Rate limiting on suggestion submission
- [x] Webhook notifications (Discord) on new suggestions

## Modrinth integration

- [x] Fetch a Modrinth user’s mod projects via `GET /api/modrinth/projects?username=...`
- [x] Add a frontend importer flow on top of the Modrinth project lookup
- [x] Let a selected Modrinth project prefill slug, title, icon, and Modrinth linkage during import
- [x] Allow manual GitHub repo URL overrides during import/project editing
- [x] Keep Modrinth integration metadata-only
- [x] Use GitHub discovery for locale JSON imports instead of target suggestions
- [ ] Add richer import result history/audit UI if we need to inspect past syncs

## Polish

- [ ] Error boundary
- [x] Toast notifications
- [x] Mobile-responsive layout
- [x] Dark mode
- [ ] Better bulk import UX for many locale files at once
- [ ] CI pipeline (typecheck + lint + test on push)
- [ ] Deploy pipeline (wrangler deploy on merge to main)
