/** Local trust configuration around the verbatim SEEDS request protocol. */
import {
  readSignedVaultRequest as readUpstreamRequest,
  parseSignedVaultRequest as parseUpstreamRequest,
  type RequestTrust,
} from "@/lib/key-signin/vault-protocol";
export {
  VAULT_REQUEST,
  VAULT_RESPONSE,
  LIVE_KEY_HOST,
  LIVE_SEEDS_DOMAIN,
  MAX_RESPONSE_CHARS,
  MAX_REQUEST_CHARS,
  SCAN_TIMEOUT_MS,
  vaultRequestBytes,
} from "@/lib/key-signin/vault-protocol";
export type {
  RequestTrust,
  SignedVaultRequest,
  UnsignedVaultRequest,
} from "@/lib/key-signin/vault-protocol";

// Independently verified 2026-11-23 against SEEDS, its live endpoint and Bobby's phone.
// SHA-256: 0556577f852b0cf2a05a1c75ecbf806e6657ce193393d9e800137b6537c86d4d.
// Retired seeds-vault-2026-11 was briefly pinned by Key, never Vault; removed Nov 23.
export const SEEDS_REQUEST_KEYS: RequestTrust = Object.freeze({
  "seeds-vault-kms-2026-11": "6_06ZOHGeDeGX7O1ToRTAmdiGs0_AOSSX70VbTd9IjA",
});
export function readSignedVaultRequest(
  value: unknown,
  trust: RequestTrust = SEEDS_REQUEST_KEYS,
  now = Date.now(),
) {
  return readUpstreamRequest(value, trust, now);
}
export function parseSignedVaultRequest(text: string, trust: RequestTrust = SEEDS_REQUEST_KEYS) {
  return parseUpstreamRequest(text, trust);
}
