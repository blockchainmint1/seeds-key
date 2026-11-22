/**
 * HME Vault's side of the Vault link — the reference the Vault project copies
 * (with src/lib/key-signin/{rules,seeds-key-reference}.ts and src/lib/pockets/).
 * Runs offline on the Vault phone; the recovery phrase stays inside it.
 * Not used by the Seeds Key page except in tests, which prove Key accepts it.
 */
import { buildHandoff, coinIdentityKey, signTxcMessage, type KeyManifest } from "@/lib/key-signin/seeds-key-reference";
import { pairingCode } from "@/lib/key-signin/rules";
import { SEEDS_POCKET } from "@/lib/pockets/coins";
import { VAULT_REQUEST, VAULT_RESPONSE } from "./vault-link";

export const LIVE_KEY_HOST = "key.seeds.honest.money";
export const LIVE_SEEDS_DOMAIN = "seeds.honest.money";

export type VaultRequest = Omit<KeyManifest, "type" | "version" | "submit_url"> & { app_name: string };

/** Parse the Key page's request QR. Vault shows app_name, pocket and the match code before the owner approves. */
export function readVaultRequest(text: string): VaultRequest & { matchCode: string } {
  const r = JSON.parse(text) as Record<string, unknown>;
  if (r["type"] !== VAULT_REQUEST || r["v"] !== 1) throw new Error("That isn't a Seeds Key request.");
  const s = (k: string) => { const v = r[k]; if (typeof v !== "string" || !v) throw new Error("Seeds Key request is incomplete."); return v; };
  if (r["key_host"] !== LIVE_KEY_HOST || r["domain"] !== LIVE_SEEDS_DOMAIN) throw new Error("This request isn't from the real Seeds Key. Stop.");
  if (r["pocket"] !== SEEDS_POCKET) throw new Error("Seeds only uses pocket 1106. Stop.");
  const req = {
    app_name: s("app_name"), domain: s("domain"), key_host: s("key_host"), challenge_id: s("challenge_id"), challenge: s("challenge"),
    recipient_pubkey: s("recipient_pubkey"), pocket: SEEDS_POCKET, issued_at: s("issued_at"), expires_at: s("expires_at"),
  };
  return { ...req, matchCode: pairingCode(req.challenge) };
}

/** After the owner approves: derive pocket 1106 for every chain, seal it to Seeds, sign as the coin identity. */
export async function buildVaultResponse(req: VaultRequest, words: string): Promise<string> {
  const manifest: KeyManifest = { type: "seeds-key-signin", version: 1, submit_url: "", ...req };
  const key = coinIdentityKey(words);
  try {
    const identity = signTxcMessage(key, "x").address;
    const h = await buildHandoff({ manifest, words, kind: "coin", identity, account: SEEDS_POCKET });
    const signature = signTxcMessage(key, h.message).signature;
    return JSON.stringify({ type: VAULT_RESPONSE, v: 1, challenge_id: req.challenge_id, message: h.message, signature, body: h.body });
  } finally { key.fill(0); }
}
