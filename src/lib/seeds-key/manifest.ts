import type { KeyManifest } from "@/lib/key-signin/seeds-key-reference";

/** Only these Seeds sites may hand this page a manifest. */
export const ALLOWED_ORIGINS = [
  "https://seeds.honest.money",
  "https://id-preview--0ce4bcf5-5883-4de0-96d3-b161585d1bf4.lovable.app",
] as const;

export type FullManifest = KeyManifest & { app_name: string; origin: string; kinds?: string[] };

export function allowedManifestUrl(r: string | null | undefined): URL | null {
  if (!r) return null;
  try {
    const u = new URL(r);
    return (ALLOWED_ORIGINS as readonly string[]).includes(u.origin) ? u : null;
  } catch {
    return null;
  }
}

/** The manifest must come from an allowed origin and submit back to that same origin. */
export function checkManifest(url: URL, m: unknown): FullManifest {
  const x = m as Partial<FullManifest>;
  if (!x || x.type !== "seeds-key-signin" || x.version !== 1) throw new Error("This sign-in request isn't from Seeds.");
  if (!x.submit_url || new URL(x.submit_url).origin !== url.origin) throw new Error("This sign-in request points somewhere other than Seeds.");
  if (!x.challenge_id || !x.challenge || !x.recipient_pubkey || !x.domain || typeof x.pocket !== "number")
    throw new Error("This sign-in request is incomplete.");
  return { ...(x as FullManifest), app_name: x.app_name ?? "Seeds", origin: x.origin ?? url.origin };
}

export async function loadManifest(r: string | null | undefined): Promise<FullManifest> {
  const url = allowedManifestUrl(r);
  if (!url) throw new Error("This link didn't come from Seeds. Start again from seeds.honest.money.");
  const res = await fetch(url.toString(), { credentials: "omit", cache: "no-store" });
  if (res.status === 404) throw new Error("This sign-in request has expired or was already used. Start again on Seeds.");
  if (!res.ok) throw new Error("Couldn't reach Seeds. Try again in a moment.");
  return checkManifest(url, await res.json());
}

export type SubmitResult =
  | { ok: true; pocket: number; newAccount: boolean }
  | { ok: false; usePocket: number }
  | { ok: false; error: string };

export function readSubmit(status: number, body: Record<string, unknown>): SubmitResult {
  if (status === 200) return { ok: true, pocket: Number(body["pocket"]), newAccount: !!body["new_account"] };
  if (status === 409 && body["error"] === "use_pocket") return { ok: false, usePocket: Number(body["account"]) };
  if (status === 409) return { ok: false, error: "This key is already linked to an Honest.Money account. Sign in on Seeds with Honest.Money instead." };
  if (status === 410) return { ok: false, error: "This request expired (they last 10 minutes). Start again on Seeds." };
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
): Promise<{ pocket: number; newAccount: boolean }> {
  let account: number | undefined;
  for (let i = 0; i < 5; i++) {
    const h = await build(account);
    const signature = await sign(h.message);
    const res = await fetch(manifest.submit_url, {
      method: "POST",
      credentials: "omit",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...h.body, message: h.message, signature }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const r = readSubmit(res.status, body);
    if (r.ok) return r;
    if ("usePocket" in r) { account = r.usePocket; continue; }
    throw new Error(r.error);
  }
  throw new Error("Seeds kept asking for a different pocket. Start again on Seeds.");
}
