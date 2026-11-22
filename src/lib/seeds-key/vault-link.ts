/**
 * HME Vault link (Bobby, Nov 22 2026): the offline Vault phone builds the
 * pocket hand-off itself, so the recovery phrase never reaches this computer.
 *
 *   Key → Vault  one QR: VAULT_REQUEST (the validated Seeds request)
 *   Vault → Key  animated HMQR2 QR: VAULT_RESPONSE (sealed pocket keys + coin signature)
 *
 * The Vault signs as kind "coin" (TXC m/44'/696969'/0'/0/0), exactly like a
 * scanned coin, so Seeds needs no change. Everything here is re-checked
 * against the request this page holds before anything is sent to Seeds.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { base64, base64urlnopad, createBase58check } from "@scure/base";
import { keySigninMessage, normalizeIdentity, shortKeyName } from "@/lib/key-signin/rules";
import { POCKET_COINS, accountPath, type PocketCoin } from "@/lib/pockets/coins";
import { readSubmit, validateActiveManifest, type FullManifest, type HandoffResult } from "./manifest";

export const VAULT_REQUEST = "hm-seeds-key-vault-request";
export const VAULT_RESPONSE = "hm-seeds-key-vault-response";
export const MAX_RESPONSE_CHARS = 64 * 1024;

/** What the Vault needs to build the hand-off. No secrets: this QR is public. */
export function vaultRequestText(m: FullManifest): string {
  return JSON.stringify({
    type: VAULT_REQUEST, v: 1, app_name: m.app_name, domain: m.domain, key_host: m.key_host,
    challenge_id: m.challenge_id, challenge: m.challenge, recipient_pubkey: m.recipient_pubkey,
    pocket: m.pocket, issued_at: m.issued_at, expires_at: m.expires_at,
  });
}

export type VaultHandoff = { message: string; signature: string; body: Record<string, unknown>; identity: string };

const enc = new TextEncoder();
const b58c = createBase58check(sha256);
const BAD = "That isn't an answer from HME Vault for this sign-in. Start again on the Vault.";

function varint(n: number): Uint8Array { return n < 0xfd ? Uint8Array.of(n) : Uint8Array.of(0xfd, n & 0xff, n >> 8); }
function cat(...p: Uint8Array[]) { const o = new Uint8Array(p.reduce((s, x) => s + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; }

/** TXC (Bitcoin-style, compressed) message signature recovers to `address`. */
export function txcSignatureMatches(address: string, message: string, signatureB64: string): boolean {
  try {
    const raw = base64.decode(signatureB64);
    if (raw.length !== 65 || raw[0]! < 31 || raw[0]! > 34) return false;
    const pfx = enc.encode("Bitcoin Signed Message:\n"), msg = enc.encode(message);
    const h = sha256(sha256(cat(varint(pfx.length), pfx, varint(msg.length), msg)));
    const sig = secp256k1.Signature.fromBytes(cat(Uint8Array.of(raw[0]! - 31), raw.slice(1)), "recovered");
    const pub = sig.recoverPublicKey(h).toBytes(true);
    return b58c.encode(cat(Uint8Array.of(66), ripemd160(sha256(pub)))) === address;
  } catch { return false; }
}

/** Parse and fully check the Vault's answer against this page's request. Throws a plain-English error. */
export function readVaultResponse(text: string, m: FullManifest): VaultHandoff {
  if (text.length > MAX_RESPONSE_CHARS) throw new Error(BAD);
  let r: Record<string, unknown>;
  try { r = JSON.parse(text) as Record<string, unknown>; } catch { throw new Error(BAD); }
  if (!r || typeof r !== "object" || r["type"] !== VAULT_RESPONSE || r["v"] !== 1) throw new Error(BAD);
  const body = r["body"] as Record<string, unknown> | undefined;
  const message = r["message"], signature = r["signature"];
  if (!body || typeof body !== "object" || typeof message !== "string" || typeof signature !== "string") throw new Error(BAD);
  if (r["challenge_id"] !== m.challenge_id || body["token"] !== m.challenge_id) throw new Error("That Vault answer is for a different sign-in. Scan this page's request again on the Vault.");
  if (body["kind"] !== "coin") throw new Error(BAD);
  const identity = normalizeIdentity("coin", String(body["identity_address"] ?? ""));
  if (!identity) throw new Error(BAD);
  const account = body["account"];
  if (account !== m.pocket) throw new Error("The Vault used a different pocket than Seeds asked for. Start again on the Vault.");
  const paths = body["paths"];
  const want = POCKET_COINS.map((c) => accountPath(c, account));
  if (!Array.isArray(paths) || paths.length !== want.length || paths.some((p, i) => p !== want[i])) throw new Error("The Vault didn't include every supported chain. Update HME Vault and try again.");
  const xpubs = body["xpubs"] as Record<string, unknown> | undefined;
  if (!xpubs || typeof xpubs !== "object" || Object.keys(xpubs).length !== POCKET_COINS.length
    || POCKET_COINS.some((c: PocketCoin) => typeof xpubs[c] !== "string" || !(xpubs[c] as string))) throw new Error(BAD);
  const payload = body["payload"];
  if (typeof payload !== "string") throw new Error(BAD);
  let sealed: Uint8Array;
  try { sealed = base64urlnopad.decode(payload); } catch { throw new Error(BAD); }
  if (sealed.length < 32 + 12 + 16) throw new Error(BAD);
  const payloadSha = Array.from(sha256(sealed), (b) => b.toString(16).padStart(2, "0")).join("");
  const expected = keySigninMessage({
    domain: m.domain, challenge: m.challenge, kind: "coin", identity, account, paths: want, payloadSha,
    keyHost: m.key_host ?? undefined, issuedAt: m.issued_at, expiresAt: m.expires_at,
  });
  if (message !== expected) throw new Error("The Vault signed different text than Seeds expects. Update HME Vault and try again.");
  if (!txcSignatureMatches(identity, message, signature)) throw new Error("The Vault's signature didn't match. Start again on the Vault.");
  return {
    message, signature, identity,
    body: { token: m.challenge_id, kind: "coin", identity_address: identity, account, paths: want, xpubs, payload },
  };
}

export const vaultSignerName = (h: VaultHandoff) => shortKeyName("coin", h.identity);

/** One POST — the Vault can't re-sign without another QR round, so a pocket change means starting again. */
export async function submitVaultHandoff(m: FullManifest, h: VaultHandoff): Promise<HandoffResult> {
  validateActiveManifest(m);
  const res = await fetch(m.submit_url, {
    method: "POST", credentials: "omit", redirect: "error", cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...h.body, message: h.message, signature: h.signature }),
  });
  const r = readSubmit(res.status, await res.json().catch(() => ({})));
  if (r.ok) return r;
  if ("usePocket" in r) throw new Error(`Seeds asked for pocket ${r.usePocket}. Start again on Seeds and scan the new request on the Vault.`);
  throw new Error(r.error);
}
