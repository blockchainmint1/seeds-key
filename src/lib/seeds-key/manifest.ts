import { base64urlnopad } from "@scure/base";
import type { KeyManifest } from "@/lib/key-signin/seeds-key-reference";
import { isKeyKind, pairingCode, KEY_REQUEST_TTL_MS, type KeyKind } from "@/lib/key-signin/rules";
import { validPocket } from "@/lib/pockets/coins";
import { currentKeyOrigin, SEEDS_PREVIEW_ORIGIN, seedsOrigins } from "./policy";

export type FullManifest = KeyManifest & { app_name: string; origin: string; kinds?: KeyKind[]; pairing_code: string };
const MANIFEST_PATH = /^\/api\/public\/key-signin\/manifest\/([a-f0-9]{32})$/;
const EXPIRED = "This sign-in was already used or ran out. If you didn't finish it yourself, someone else may have used your code — on Seeds, tap \"No, that's not mine\" and start again.";

export function allowedManifestUrl(r: string | null | undefined, keyOrigin = currentKeyOrigin()): URL | null {
  if (!r) return null;
  try {
    const u = new URL(r);
    return seedsOrigins(keyOrigin).includes(u.origin) && !u.username && !u.password && !u.search && !u.hash && MANIFEST_PATH.test(u.pathname) ? u : null;
  } catch {
    return null;
  }
}

function assertExpiry(expiresAt: string): void {
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires) || expires <= Date.now()) throw new Error(EXPIRED);
}

/** Only validated protocol values leave this boundary; branding is never supplied by JSON. */
export function checkManifest(url: URL, m: unknown, keyOrigin = currentKeyOrigin()): FullManifest {
  if (!allowedManifestUrl(url.href, keyOrigin) || !m || typeof m !== "object" || Array.isArray(m)) {
    throw new Error("This sign-in request isn't from Seeds.");
  }
  const x = m as Record<string, unknown>;
  if (x["type"] !== "seeds-key-signin" || x["version"] !== 1) throw new Error("This sign-in request isn't from Seeds.");
  const submit = x["submit_url"];
  if (typeof submit !== "string" || submit !== `${url.origin}/api/public/key-signin/submit`) {
    throw new Error("This sign-in request points somewhere other than Seeds.");
  }
  const domain = x["domain"];
  if (domain !== url.host) throw new Error("This sign-in request isn't for the site it came from.");
  const token = x["challenge_id"], challenge = x["challenge"], recipient = x["recipient_pubkey"], expires = x["expires_at"], pocket = x["pocket"];
  if (typeof token !== "string" || token !== MANIFEST_PATH.exec(url.pathname)?.[1] ||
      typeof challenge !== "string" || !/^[a-f0-9]{48}$/.test(challenge) ||
      typeof recipient !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(recipient) ||
      typeof expires !== "string" || !validPocket(pocket)) {
    throw new Error("This sign-in request is incomplete.");
  }
  try {
    const publicKey = base64urlnopad.decode(recipient);
    if (publicKey.length !== 32 || !publicKey.some((byte) => byte !== 0)) throw new Error();
  } catch { throw new Error("This sign-in request has an invalid recipient key."); }
  assertExpiry(expires);
  const keyHost = x["key_host"], issued = x["issued_at"], code = x["pairing_code"];
  if (keyHost !== new URL(keyOrigin).host) throw new Error("This sign-in request isn't for this Seeds Key page.");
  if (typeof issued !== "string" || !Number.isFinite(Date.parse(issued)) ||
      Date.parse(issued) > Date.now() || Date.parse(issued) >= Date.parse(expires) ||
      Date.parse(expires) - Date.parse(issued) > KEY_REQUEST_TTL_MS) {
    throw new Error("This sign-in request has invalid request times.");
  }
  if (typeof code !== "string" || code !== pairingCode(challenge)) throw new Error("This sign-in request has an invalid match code.");
  const kinds = x["kinds"];
  if (kinds !== undefined && (!Array.isArray(kinds) || !kinds.length || !kinds.every(isKeyKind))) {
    throw new Error("This sign-in request has invalid wallet choices.");
  }
  return {
    type: "seeds-key-signin", version: 1, domain, challenge_id: token, challenge,
    recipient_pubkey: recipient, submit_url: submit, expires_at: expires, pocket,
    key_host: keyHost, issued_at: issued, pairing_code: code,
    app_name: url.origin === SEEDS_PREVIEW_ORIGIN ? "Seeds Exchange (preview)" : "Seeds Exchange",
    origin: url.origin,
    ...(Array.isArray(kinds) ? { kinds: kinds.filter(isKeyKind) } : {}),
  };
}

export function validateActiveManifest(manifest: FullManifest): FullManifest {
  return checkManifest(new URL(`${manifest.origin}/api/public/key-signin/manifest/${manifest.challenge_id}`), manifest);
}

export function seedsReturnUrl(manifest: FullManifest, kind: "coin" | "wallet"): string {
  if (!seedsOrigins(currentKeyOrigin()).includes(manifest.origin)) throw new Error("This sign-in request isn't from Seeds.");
  return `${manifest.origin}/key-signin?kind=${kind}`;
}

export async function loadManifest(r: string | null | undefined, signal?: AbortSignal): Promise<FullManifest> {
  const url = allowedManifestUrl(r);
  if (!url) throw new Error("This link didn't come from Seeds. Start again from seeds.honest.money.");
  const res = await fetch(url.toString(), { credentials: "omit", cache: "no-store", redirect: "error", ...(signal ? { signal } : {}) });
  if ([404, 409, 410].includes(res.status)) throw new Error(EXPIRED);
  if (!res.ok) throw new Error("Couldn't reach Seeds. Try again in a moment.");
  return checkManifest(url, await res.json());
}

export type HandoffResult =
  | { signedIn: true; pocket: number; newAccount: boolean }
  | { signedIn: false; needsConfirm: true; pocket: number };

export type SubmitResult =
  | ({ ok: true } & HandoffResult)
  | { ok: false; usePocket: number }
  | { ok: false; error: string };

export function readSubmit(status: number, value: unknown): SubmitResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Seeds returned an invalid response. Start again on Seeds." };
  const body = value as Record<string, unknown>;
  if (status === 200) {
    if (!validPocket(body["pocket"])) return { ok: false, error: "Seeds returned an invalid pocket. Start again on Seeds." };
    if (body["signed_in"] === false && body["needs_confirm"] === true) return { ok: true, signedIn: false, needsConfirm: true, pocket: body["pocket"] };
    if (body["signed_in"] === true && body["needs_confirm"] !== true && typeof body["new_account"] === "boolean") return { ok: true, signedIn: true, pocket: body["pocket"], newAccount: body["new_account"] };
    return { ok: false, error: "Seeds returned an invalid sign-in response. Start again on Seeds." };
  }
  if (status === 409 && body["error"] === "use_pocket") return validPocket(body["account"])
    ? { ok: false, usePocket: body["account"] }
    : { ok: false, error: "Seeds returned an invalid pocket. Start again on Seeds." };
  if (status === 409 && body["error"] === "already used") return { ok: false, error: EXPIRED };
  if (status === 409) return { ok: false, error: "This key is already linked to an Honest.Money account. Sign in on Seeds with Honest.Money instead." };
  if (status === 410) return { ok: false, error: EXPIRED };
  if (status === 400) return { ok: false, error: "The signed text didn't match what Seeds expected. Start again on Seeds." };
  if (status === 401) return { ok: false, error: "The signature didn't match. Try again." };
  if (status === 429) return { ok: false, error: "Too many new accounts from this network this hour. Try again later." };
  return { ok: false, error: typeof body["error"] === "string" ? (body["error"] as string) : "Something went wrong. Try again." };
}

/** Build, sign, POST; on use_pocket, rebuild on the pocket Seeds names (at most 5 tries). */
export async function submitWithRetry(
  manifest: FullManifest,
  build: (account?: number) => Promise<{ message: string; body: Record<string, unknown> }>,
  sign: (message: string) => Promise<string>,
): Promise<HandoffResult> {
  let account: number | undefined;
  for (let i = 0; i < 5; i++) {
    validateActiveManifest(manifest);
    const h = await build(account);
    const signature = await sign(h.message);
    validateActiveManifest(manifest);
    const res = await fetch(manifest.submit_url, {
      method: "POST",
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...h.body, message: h.message, signature }),
    });
    const body: unknown = await res.json().catch(() => ({}));
    const r = readSubmit(res.status, body);
    if (r.ok) return r;
    if ("usePocket" in r) { account = r.usePocket; continue; }
    throw new Error(r.error);
  }
  throw new Error("Seeds kept asking for a different pocket. Start again on Seeds.");
}
