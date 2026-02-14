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
 * Hash algorithm: scrypt (Node) with random salt.
 * Store token_hash in DB as: scrypt$saltHex$derivedHex
 */

import crypto from 'node:crypto';

const scopes = process.argv[2] || 'export:read';

const token = `kaf_${crypto.randomBytes(24).toString('base64url')}`;
const salt = crypto.randomBytes(16);
const derived = crypto.scryptSync(token, salt, 32);

const token_hash = `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;

console.log(JSON.stringify({ token, token_hash, scopes }, null, 2));
