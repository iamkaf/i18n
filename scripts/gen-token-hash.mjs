#!/usr/bin/env node
/**
 * Tiny helper for creating kaf_<token> values and a hash to store in D1.
 *
 * Usage:
 *   node scripts/gen-token-hash.mjs "catalog:write export:read"
 *
 * Output:
 *   - token (print once)
 *   - token_hash (hex)
 *
 * Hash algorithm: sha256(salt:token:pepper)
 * Store token_hash in DB as: sha256$saltHex$digestHex
 *
 * Pepper:
 * - Optional.
 * - If set, it must match the server env var: KAF_TOKEN_PEPPER.
 */

import crypto from 'node:crypto';

const scopes = process.argv[2] || 'export:read';
const pepper = (process.env.KAF_TOKEN_PEPPER || '').trim();

const token = `kaf_${crypto.randomBytes(24).toString('base64url')}`;
const saltHex = crypto.randomBytes(16).toString('hex');

const digestHex = crypto
  .createHash('sha256')
  .update(`${saltHex}:${token}:${pepper}`)
  .digest('hex');

const token_hash = `sha256$${saltHex}$${digestHex}`;

console.log(JSON.stringify({ token, token_hash, scopes }, null, 2));
