# i18n.kaf.sh — TODO

## Setup
- [ ] Fill `.dev.vars` with real Discord app credentials + 32-byte hex `SESSION_SECRET`
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
- [ ] Login / logout UI (call `/api/auth/discord`, show user from `/api/auth/me`)
- [ ] Project browser (list projects from DB or Modrinth)
- [ ] Source string viewer per target/locale
- [ ] Suggestion submission form with placeholder validation feedback
- [ ] Suggestion list view (filterable by status/locale/project)
- [ ] Moderation panel (approve/reject with notes)
- [ ] Translation progress indicators per locale

## Backend
- [ ] `PATCH /api/suggestions/[id]` — edit pending suggestion (author only)
- [ ] `DELETE /api/suggestions/[id]` — withdraw pending suggestion (author only)
- [ ] `GET /api/projects` — list projects (public visibility)
- [ ] `GET /api/projects/[slug]/targets` — list targets for a project
- [ ] `GET /api/projects/[slug]/[target]/strings` — paginated source strings
- [ ] `GET /api/projects/[slug]/[target]/progress` — translation coverage per locale
- [ ] Rate limiting on suggestion submission
- [ ] Webhook notifications (Discord) on new suggestions

## Polish
- [ ] Error boundary / toast notifications
- [ ] Mobile-responsive layout
- [ ] Dark mode
- [ ] CI pipeline (typecheck + lint + test on push)
- [ ] Deploy pipeline (wrangler deploy on merge to main)
