# i18n.kaf.sh — TODO

## Guardrails

- [ ] Keep copy and UX framed as an atelier for Kaf's mods (not SaaS/platform language)
- [ ] Reject scope that implies multi-tenant/org-management behavior

## Setup

- [x] Fill `.dev.vars` with real Discord app credentials + 32-byte hex `SESSION_SECRET`
- [ ] Register Discord OAuth2 app; add redirect URIs:
  - `https://i18n.kaf.sh/api/auth/callback`
  - `http://localhost:3000/api/auth/callback`
- [ ] `wrangler d1 migrations apply i18n --remote`
- [ ] `wrangler secret put DISCORD_CLIENT_ID`
- [ ] `wrangler secret put DISCORD_CLIENT_SECRET`
- [ ] `wrangler secret put SESSION_SECRET`
- [ ] Seed `trusted_users` table with moderator Discord IDs
- [ ] Create at least one API token (`npm run token:new`)

## Frontend

- [x] Login / logout UI (call `/api/auth/discord`, show user from `/api/auth/me`)
- [x] Project browser (list projects from DB)
- [ ] Suggestion submission form wired to `POST /api/suggestions` with placeholder mismatch + rate-limit feedback
- [ ] Suggestion editing/withdraw controls for author (`PATCH`/`DELETE /api/suggestions/[id]`)
- [ ] Suggestion list view (filter by status/locale/project)
- [ ] Moderation panel (approve/reject with decision note)
- [ ] Auth-aware route guards and empty states for private project views
- [ ] Surface submission outcomes in UI copy/toasts (accepted/rejected/rate-limited)

## Pages

- [ ] Project details route (`/projects/[slug]`) with target list from `/api/projects/[slug]/targets`
- [ ] Source string viewer route (`/projects/[slug]/[target]`) with pagination/search/locale
- [ ] Translation progress indicators per locale from `/api/projects/[slug]/[target]/progress`

## Backend

- [x] `PATCH /api/suggestions/[id]` — edit pending suggestion (author only)
- [x] `DELETE /api/suggestions/[id]` — withdraw pending suggestion (author only)
- [x] `GET /api/projects` — list projects (public visibility)
- [x] `GET /api/projects/[slug]/targets` — list targets for a project
- [x] `GET /api/projects/[slug]/[target]/strings` — paginated source strings
- [x] `GET /api/projects/[slug]/[target]/progress` — translation coverage per locale
- [x] Rate limiting on suggestion submission
- [x] Webhook notifications (Discord) on new suggestions

## Polish

- [ ] Error boundary / toast notifications
- [ ] Mobile-responsive layout
- [x] Dark mode
- [ ] CI pipeline (typecheck + lint + test on push)
- [ ] Deploy pipeline (wrangler deploy on merge to main)
