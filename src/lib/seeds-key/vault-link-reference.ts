/**
 * HME Vault's side of the Vault link — the reference the Vault project copies
 * (with src/lib/key-signin/{rules,seeds-key-reference}.ts and src/lib/pockets/).
 * Runs offline on the Vault phone; the recovery phrase stays inside it.
 * Not used by the Seeds Key page except in tests, which prove Key accepts it.
 */
import { buildHandoff, coinIdentityKey, signTxcMessage, type KeyManifest } from "@/lib/key-signin/seeds-key-reference";
import { pairingCode } from "@/lib/key-signin/rules";
import { SEEDS_POCKET } from "@/lib/pockets/coins";
import { VAULT_RESPONSE, parseSignedVaultRequest, readSignedVaultRequest, SEEDS_REQUEST_KEYS, type RequestTrust, type SignedVaultRequest } from "./vault-protocol";

export { LIVE_KEY_HOST, LIVE_SEEDS_DOMAIN } from "./vault-protocol";

export type VaultRequest = SignedVaultRequest;

/** Parse the Key page's request QR. Vault shows app_name, pocket and the match code before the owner approves. */
export function readVaultRequest(text: string, trust: RequestTrust = SEEDS_REQUEST_KEYS): VaultRequest & { matchCode: string } {
  const req = parseSignedVaultRequest(text, trust);
  return { ...req, matchCode: pairingCode(req.challenge) };
}

/** After the owner approves: derive pocket 1106 for every chain, seal it to Seeds, sign as the coin identity. */
export async function buildVaultResponse(req: VaultRequest, words: string, trust: RequestTrust = SEEDS_REQUEST_KEYS): Promise<string> {
  const r = readSignedVaultRequest(req, trust);
  const manifest: KeyManifest = {
    type: "seeds-key-signin", version: 1, submit_url: "", domain: r.domain, key_host: r.key_host,
    challenge_id: r.challenge_id, challenge: r.challenge, recipient_pubkey: r.recipient_pubkey,
    pocket: SEEDS_POCKET, issued_at: r.issued_at, expires_at: r.expires_at,
  };
  const key = coinIdentityKey(words);
  try {
    const identity = signTxcMessage(key, "x").address;
    const h = await buildHandoff({ manifest, words, kind: "coin", identity, account: SEEDS_POCKET });
    const signature = signTxcMessage(key, h.message).signature;
    readSignedVaultRequest(r, trust); // Derivation may have taken time; do not display an expired answer.
    return JSON.stringify({ type: VAULT_RESPONSE, v: 2, challenge_id: r.challenge_id, message: h.message, signature, body: h.body });
  } finally { key.fill(0); }
}
