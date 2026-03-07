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

## Frontend

- [x] Login / logout UI (call `/api/auth/discord`, show user from `/api/auth/me`)
- [x] Project browser (list projects from DB)
- [x] Suggestion submission form wired to `POST /api/suggestions` with placeholder mismatch + rate-limit feedback
- [x] Suggestion editing/withdraw controls for author (`PATCH`/`DELETE /api/suggestions/[id]`)
- [x] Suggestion list view (filter by status/locale/project)
- [x] Moderation panel (approve/reject with decision note)
- [x] Auth-aware route guards and empty states for private project views
- [x] Surface submission outcomes in UI copy/toasts (accepted/rejected/rate-limited)
- [x] God-only user management view and Discord ID-based management routes

## Pages

- [x] Project details route (`/projects/[slug]`) with target list from `/api/projects/[slug]/targets`
- [x] Source string viewer route (`/projects/[slug]/[target]`) with pagination/search/locale
- [x] Translation progress indicators per locale from `/api/projects/[slug]/[target]/progress`
- [x] Contributor history route (`/suggestions`)
- [x] Moderator queue route (`/moderation`)
- [x] God-only user management route (`/users`)

## Backend

- [x] `PATCH /api/suggestions/[id]` — edit pending suggestion (author only)
- [x] `DELETE /api/suggestions/[id]` — withdraw pending suggestion (author only)
- [x] `GET /api/projects` — list projects (public visibility)
- [x] `GET /api/projects/[slug]` — project detail
- [x] `GET /api/projects/[slug]/targets` — list targets for a project
- [x] `GET /api/projects/[slug]/[target]/strings` — paginated source strings
- [x] `GET /api/projects/[slug]/[target]/progress` — translation coverage per locale
- [x] `GET /api/suggestions` — filtered suggestion lists for contributors and moderators
- [x] `GET /api/users` — god-only elevated-user listing
- [x] `PATCH /api/users/[discordId]` — god-only role updates by Discord ID
- [x] `DELETE /api/users/[discordId]` — god-only demotion by Discord ID
- [x] Rate limiting on suggestion submission
- [x] Webhook notifications (Discord) on new suggestions

## Modrinth integration

- [x] Fetch a Modrinth user’s mod projects via `GET /api/modrinth/projects?username=...`
- [ ] Add a frontend importer flow on top of the Modrinth project lookup
- [ ] Let a selected Modrinth project prefill slug, title, icon, and Modrinth linkage during import
- [ ] Decide whether target creation should be derived from Modrinth versions or remain explicit during catalog upload
- [ ] Keep Modrinth integration metadata-only unless there is a reliable source-catalog ingestion path
- [ ] Document the exact boundary: Modrinth helps discover project metadata; catalogs still come from the mod source/build pipeline

## Polish

- [ ] Error boundary
- [x] Toast notifications
- [x] Mobile-responsive layout
- [x] Dark mode
- [ ] CI pipeline (typecheck + lint + test on push)
- [ ] Deploy pipeline (wrangler deploy on merge to main)
