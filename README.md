# i18n.kaf.sh

An invitation to Kaf’s atelier.

This repo is a small, purpose-built site for crowdsourced translations of Kaf’s Minecraft mods.
It is **not** a platform, **not** a SaaS, and **not** a general-purpose service.

## What it does

- Contributors can suggest translations (Discord login required).
- Trusted translators can approve/reject suggestions.
- Builds can **consume approved translations via API exports**.
- Projects can be **Public** or **Private**:
  - **Public** exports are readable without tokens.
  - **Private** exports require a PAT.

## Stack

- Cloudflare (Workers runtime via OpenNext)
- TypeScript + React (Next.js)
- Tailwind
- Database: TBD (likely Cloudflare D1)
- Auth: Discord OAuth

## Auth & tokens

This project uses simple Personal Access Tokens (PATs) for machine-to-machine API access.

- Header: `Authorization: Bearer kaf_<token>`
- Tokens are opaque, generated once, and should be stored securely.

Planned scopes (MVP):
- `catalog:write` — push/update source catalogs (imports)
- `export:read` — read exports for private projects
- `moderate:write` — approve/reject suggestions

## Import flows (planned)

Two ways to bring mods/strings into the atelier:

### 1) API import (authoritative)
For automation and CI.

- Upsert a project + target (ex: `1.21.11` or `latest`)
- Upload a source catalog (`en_us` strings + optional context)

### 2) UI importer (convenience)
For onboarding projects via discovery.

- Uses the Modrinth API to list projects and import metadata.
- Still requires a catalog upload/push to become exportable.

## Export (planned)

Build systems consume approved translations via HTTP:

- `GET /api/export/<mod>/<target>/<locale>`

Rules:
- Public project → anonymous read allowed
- Private project → requires `Authorization: Bearer kaf_<token>`

## Database (D1)

Schema lives in:
- `db/migrations/0001_init.sql`
- `db/seed.sql`

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

## Non-goals

- Multi-tenant features
- Org/team management
- Generic “translation platform” ambitions

If it doesn’t serve the atelier, it doesn’t ship.
