/** Public, deterministic test key. NEVER install this key in production trust. */
import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { base64urlnopad } from "@scure/base";
import { POCKET_COINS, accountPath } from "@/lib/pockets/coins";
import { pairingCode } from "@/lib/key-signin/rules";
import { vaultRequestBytes, VAULT_REQUEST, type UnsignedVaultRequest } from "@/lib/seeds-key/vault-protocol";
import type { FullManifest } from "@/lib/seeds-key/manifest";
export const TEST_SIGNING_SECRET = new Uint8Array(32).fill(42);
export const TEST_TRUST = { "test-only": base64urlnopad.encode(ed25519.getPublicKey(TEST_SIGNING_SECRET)) };
export function signedRequest(overrides: Partial<UnsignedVaultRequest> = {}) {
  const now = Date.now();
  const r: UnsignedVaultRequest = {
    type: VAULT_REQUEST, v: 2, signing_key_id: "test-only", domain: "seeds.honest.money", key_host: "key.seeds.honest.money",
    challenge_id: "a".repeat(32), challenge: "c".repeat(48), recipient_pubkey: base64urlnopad.encode(x25519.getPublicKey(new Uint8Array(32).fill(7))),
    pocket: 1106, issued_at: new Date(now).toISOString(), expires_at: new Date(now + 600_000).toISOString(),
    paths: POCKET_COINS.map((c) => accountPath(c, 1106)), ...overrides,
  };
  return { ...r, request_sig: base64urlnopad.encode(ed25519.sign(vaultRequestBytes(r), TEST_SIGNING_SECRET)) };
}
export function vaultManifest(): FullManifest {
  const r = signedRequest();
  return { type: "seeds-key-signin", version: 1, app_name: "Seeds Exchange", domain: r.domain, origin: "https://seeds.honest.money",
    challenge_id: r.challenge_id, challenge: r.challenge, recipient_pubkey: r.recipient_pubkey, pocket: 1106,
    submit_url: "https://seeds.honest.money/api/public/key-signin/submit", key_host: r.key_host, issued_at: r.issued_at,
    expires_at: r.expires_at, pairing_code: pairingCode(r.challenge), vault_request: r };
}