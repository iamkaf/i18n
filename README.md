# i18n.kaf.sh

An invitation to Kaf’s atelier.

This repo is a small, purpose-built site for crowdsourced translations of Kaf’s Minecraft mods.
It is **not** a platform, **not** a SaaS, and **not** a general-purpose service.

## What it does

- Each project has one canonical `en_us` source catalog.
- Approved locale translations are stored at the project level on top of that source catalog.
- God users can import `en_us` and additional locale JSON files from GitHub or manual upload.
- Contributors can suggest translation changes (Discord login required).
- Contributors can edit or withdraw their own pending suggestions.
- Trusted translators can approve/reject suggestions from a moderation queue.
- A single hardcoded Discord account is the `god` user and can manage elevated users by Discord ID.
- Builds can consume approved translations via API exports.
- Projects can be **Public** or **Private**:
  - **Public** exports are readable without tokens.
  - **Private** exports require a PAT.
- The frontend already includes:
  - `/projects` project browser
  - `/projects/[slug]` unified project workbench
  - `/suggestions` contributor history
  - `/moderation` moderator queue
  - `/users` god-only user management

## Stack

- Cloudflare (Workers runtime via OpenNext)
- TypeScript + React (Next.js)
- Tailwind
- Database: Cloudflare D1
- Auth: Discord OAuth

## Auth, roles, and tokens

Role model:

- `user` — regular signed-in contributor
- `trusted` — can moderate suggestions
- `god` — can manage elevated users

Notes:

- Elevated users are stored by Discord ID.
- Only one Discord ID may ever be `god`: `517599684961894400`.
- `/api/auth/me` returns the current session plus derived role flags.
- God-only user management lives at `/users`, backed by `/api/users` and `/api/users/[discordId]`.

This project uses simple Personal Access Tokens (PATs) for machine-to-machine API access.

- Header: `Authorization: Bearer kaf_<token>`
- Tokens are opaque, generated once, and should be stored securely.

Token scopes:

- `catalog:write` — push/update source catalogs (imports)
- `export:read` — read exports for private projects
- `moderate:write` — approve/reject suggestions

## Import flows

Two ways to bring mods/strings into the atelier:

### 1) API import (authoritative)

Implemented. For automation and CI.

- Upsert a project shell plus locale catalog
- `locale=en_us` updates the canonical source catalog immediately
- Any other locale updates approved translations immediately
- Route: `POST /api/catalogs/upsert`
- Requires PAT scope: `catalog:write`

### 2) UI importer (convenience)

Implemented. For onboarding projects via discovery.

- `/users` can import project metadata from Modrinth and store optional GitHub linkage.
- `/projects/[slug]` can discover locale JSON files from the linked GitHub repo.
- `en_us.json` imports become the canonical source of truth immediately.
- Additional locale files like `zh_cn.json` import directly as approved translations.
- Modrinth remains metadata/discovery only. It does not provide the source catalog.

## Export

Build systems consume approved translations via HTTP:

- `GET /api/export/<project>/<locale>`

Rules:

- Public project → anonymous read allowed
- Private project → requires `Authorization: Bearer kaf_<token>`

Export behavior:

- `en_us` exports canonical source text
- other locales export approved translations with English fallback for missing keys

## Database (D1)

Schema lives in:

- `db/migrations/0001_init.sql`

Token helper:

```bash
npm run token:new -- "catalog:write export:read"
```

It prints a `kaf_<token>` and a `token_hash` string to store in D1 (we never store raw tokens).

## Local development

Install deps:

```bash
npm i
```

Run Next.js dev server:

```bash
npm run dev
```

Preview on the Cloudflare runtime locally (OpenNext + Wrangler):

```bash
npm run preview
```

Deploy:

```bash
npm run deploy
```

Typegen Cloudflare env types:

```bash
npm run cf-typegen
```

## Deployment

- Custom domain: `i18n.kaf.sh`
- Wrangler config: `wrangler.jsonc`
- Required secrets:
  - `DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_SECRET`
  - `SESSION_SECRET`
  - optional: `DISCORD_SUGGESTIONS_WEBHOOK_URL`

## Non-goals

- Multi-tenant features
- Org/team management
- Generic “translation platform” ambitions
- Per-version or per-target translation sets

If it doesn’t serve the atelier, it doesn’t ship.
