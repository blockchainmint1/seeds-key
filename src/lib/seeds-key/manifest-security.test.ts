import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { base64urlnopad } from "@scure/base";
import { allowedManifestUrl, checkManifest, loadManifest, readSubmit, seedsReturnUrl, submitWithRetry } from "./manifest";
import { pairingCode } from "@/lib/key-signin/rules";
import { KEY_PREVIEW_ORIGIN, LIVE_KEY_ORIGIN, SEEDS_ORIGIN, SEEDS_PREVIEW_ORIGIN, seedsOrigins } from "./policy";

const TOKEN = "a".repeat(32);
const url = (origin = SEEDS_ORIGIN) => new URL(`${origin}/api/public/key-signin/manifest/${TOKEN}`);
const fixture = (origin = SEEDS_ORIGIN, keyOrigin = LIVE_KEY_ORIGIN) => ({
  type: "seeds-key-signin", version: 1, domain: new URL(origin).host,
  challenge_id: TOKEN, challenge: "c".repeat(48),
  recipient_pubkey: base64urlnopad.encode(new Uint8Array(32).fill(1)),
  submit_url: `${origin}/api/public/key-signin/submit`,
  expires_at: new Date(Date.now() + 60_000).toISOString(), pocket: 1106,
  kinds: ["coin", "evm", "sol"],
  key_host: new URL(keyOrigin).host, issued_at: new Date(Date.now() - 1000).toISOString(), pairing_code: pairingCode("c".repeat(48)),
});
beforeEach(() => vi.stubGlobal("window", { location: { origin: "http://localhost:8080", host: "localhost:8080" } }));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("deployment trust boundaries", () => {
  it("production and the published alias accept only production SEEDS", () => {
    expect(seedsOrigins(LIVE_KEY_ORIGIN)).toEqual([SEEDS_ORIGIN]);
    expect(seedsOrigins("https://seeds-key.lovable.app")).toEqual([SEEDS_ORIGIN]);
    expect(allowedManifestUrl(url(SEEDS_PREVIEW_ORIGIN).href, LIVE_KEY_ORIGIN)).toBeNull();
  });
  it("only the designated Key preview and local development trust SEEDS preview", () => {
    expect(allowedManifestUrl(url(SEEDS_PREVIEW_ORIGIN).href, KEY_PREVIEW_ORIGIN)?.origin).toBe(SEEDS_PREVIEW_ORIGIN);
    expect(seedsOrigins("http://localhost:8080")).toContain(SEEDS_PREVIEW_ORIGIN);
    expect(allowedManifestUrl(url(SEEDS_PREVIEW_ORIGIN).href, "https://unexpected.lovable.app")).toBeNull();
  });
  it("rejects look-alike origins, credentials and non-protocol paths", () => {
    for (const address of [
      `https://seeds.honest.money.evil.com${url().pathname}`,
      `http://seeds.honest.money${url().pathname}`,
      `https://attacker@seeds.honest.money${url().pathname}`,
      `${SEEDS_ORIGIN}/other/${TOKEN}`, `${url().href}?next=evil`, `${url().href}#evil`,
    ]) expect(allowedManifestUrl(address, LIVE_KEY_ORIGIN)).toBeNull();
  });
});

describe("manifest identity and protocol validation", () => {
  it("ignores spoofed branding and return origin in otherwise legitimate JSON", () => {
    const m = checkManifest(url(), { ...fixture(), origin: "https://evil.com", app_name: "Attacker" }, LIVE_KEY_ORIGIN);
    expect(m.origin).toBe(SEEDS_ORIGIN);
    expect(m.app_name).toBe("Seeds Exchange");
  });
  it("rejects a preview manifest relaying a production signed domain", () => {
    expect(() => checkManifest(url(SEEDS_PREVIEW_ORIGIN), { ...fixture(SEEDS_PREVIEW_ORIGIN, KEY_PREVIEW_ORIGIN), domain: "seeds.honest.money" }, KEY_PREVIEW_ORIGIN)).toThrow();
  });
  it("labels legitimate previews and preserves their signed host", () => {
    const m = checkManifest(url(SEEDS_PREVIEW_ORIGIN), fixture(SEEDS_PREVIEW_ORIGIN, KEY_PREVIEW_ORIGIN), KEY_PREVIEW_ORIGIN);
    expect(m.domain).toBe(new URL(SEEDS_PREVIEW_ORIGIN).host);
    expect(m.app_name).toBe("Seeds Exchange (preview)");
  });
  it("requires the exact same-origin submit endpoint", () => {
    for (const endpoint of ["https://evil.com/submit", `${SEEDS_ORIGIN}/other`, `${SEEDS_ORIGIN}/api/public/key-signin/submit?next=evil`]) {
      expect(() => checkManifest(url(), { ...fixture(), submit_url: endpoint }, LIVE_KEY_ORIGIN)).toThrow();
    }
  });
  it("matches the challenge ID to the URL", () => {
    expect(() => checkManifest(url(), { ...fixture(), challenge_id: "b".repeat(32) }, LIVE_KEY_ORIGIN)).toThrow();
  });
  it("rejects malformed types and unusable recipient keys", () => {
    for (const value of [null, [], { ...fixture(), challenge: {} }, { ...fixture(), recipient_pubkey: 42 },
      { ...fixture(), recipient_pubkey: base64urlnopad.encode(new Uint8Array(32)) }, { ...fixture(), kinds: ["unknown"] }]) {
      expect(() => checkManifest(url(), value, LIVE_KEY_ORIGIN)).toThrow();
    }
  });
  it("enforces trading pockets 1106 through 2105, never savings account zero", () => {
    for (const pocket of [1106, 2105]) expect(checkManifest(url(), { ...fixture(), pocket }, LIVE_KEY_ORIGIN).pocket).toBe(pocket);
    for (const pocket of [0, 1105, 2106, 1106.5, "1106", NaN]) expect(() => checkManifest(url(), { ...fixture(), pocket }, LIVE_KEY_ORIGIN)).toThrow();
  });
  it("rejects missing, invalid and expired timestamps, including expiry at the current instant", () => {
    for (const expires_at of [undefined, "not-a-date", new Date(Date.now() - 1).toISOString(), new Date(Date.now()).toISOString()]) {
      expect(() => checkManifest(url(), { ...fixture(), expires_at }, LIVE_KEY_ORIGIN)).toThrow();
    }
  });
  it("keeps coin and wallet return choices on the verified origin", () => {
    const m = checkManifest(url(), fixture(SEEDS_ORIGIN, "http://localhost:8080"), "http://localhost:8080");
    expect(seedsReturnUrl(m, "coin")).toBe(`${SEEDS_ORIGIN}/key-signin?kind=coin`);
    expect(seedsReturnUrl(m, "wallet")).toBe(`${SEEDS_ORIGIN}/key-signin?kind=wallet`);
    expect(() => seedsReturnUrl({ ...m, origin: "https://evil.com" }, "coin")).toThrow();
  });
});

describe("fetch and handoff boundaries", () => {
  it("forbids redirects and cookies on manifest reads", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(fixture(SEEDS_ORIGIN, "http://localhost:8080")));
    vi.stubGlobal("fetch", fetcher);
    const m = await loadManifest(url().href);
    expect(m.origin).toBe(SEEDS_ORIGIN);
    expect(fetcher).toHaveBeenCalledWith(url().href, expect.objectContaining({ redirect: "error", credentials: "omit", cache: "no-store" }));
  });
  it("refuses malformed success and retry responses", () => {
    for (const value of [null, [], { pocket: "1106", new_account: false }, { pocket: 0, new_account: false }, { pocket: 1106, new_account: "yes" }]) {
      expect(readSubmit(200, value).ok).toBe(false);
    }
    for (const account of [0, 2106, "1106", 1106.5]) expect(readSubmit(409, { error: "use_pocket", account })).not.toHaveProperty("usePocket");
    expect(readSubmit(200, { pocket: 2105, signed_in: true, new_account: false })).toEqual({ ok: true, signedIn: true, pocket: 2105, newAccount: false });
  });
  it("does no key building or signing for an expired request", async () => {
    const m = checkManifest(url(), fixture(SEEDS_ORIGIN, "http://localhost:8080"), "http://localhost:8080");
    m.expires_at = new Date(Date.now() - 1).toISOString();
    const build = vi.fn(), sign = vi.fn(), fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(submitWithRetry(m, build, sign)).rejects.toThrow();
    expect(build).not.toHaveBeenCalled(); expect(sign).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("rechecks expiry after wallet approval before posting", async () => {
    vi.useFakeTimers();
    const m = checkManifest(url(), fixture(SEEDS_ORIGIN, "http://localhost:8080"), "http://localhost:8080");
    const build = vi.fn().mockResolvedValue({ message: "synthetic test", body: {} });
    const sign = vi.fn().mockImplementation(async () => { vi.advanceTimersByTime(60_001); return "synthetic"; });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(submitWithRetry(m, build, sign)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rebuilds only a validated retry pocket and posts without redirects or credentials", async () => {
    const m = checkManifest(url(), fixture(SEEDS_ORIGIN, "http://localhost:8080"), "http://localhost:8080");
    const build = vi.fn().mockResolvedValue({ message: "synthetic test", body: {} });
    const sign = vi.fn().mockResolvedValue("synthetic");
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ error: "use_pocket", account: 1107 }, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ pocket: 1107, signed_in: true, new_account: false }));
    vi.stubGlobal("fetch", fetcher);
    await expect(submitWithRetry(m, build, sign)).resolves.toEqual({ ok: true, signedIn: true, pocket: 1107, newAccount: false });
    expect(build).toHaveBeenNthCalledWith(2, 1107);
    expect(fetcher).toHaveBeenCalledWith(m.submit_url, expect.objectContaining({ redirect: "error", credentials: "omit" }));
  });
  it("caps valid pocket retries at five without a sixth signing request", async () => {
    const m = checkManifest(url(), fixture(SEEDS_ORIGIN, "http://localhost:8080"), "http://localhost:8080");
    const build = vi.fn().mockResolvedValue({ message: "synthetic test", body: {} });
    const sign = vi.fn().mockResolvedValue("synthetic");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ error: "use_pocket", account: 1107 }, { status: 409 })));
    await expect(submitWithRetry(m, build, sign)).rejects.toThrow();
    expect(build).toHaveBeenCalledTimes(5); expect(sign).toHaveBeenCalledTimes(5);
  });
});
import { isKeyPreview as previewCheck } from "./policy";
describe("localhost dev-only trust", () => {
  it("rejects localhost outside development", () => {
    expect(previewCheck("http://localhost:8080", false)).toBe(false);
  });
  it("accepts localhost in development", () => {
    expect(previewCheck("http://localhost:8080", true)).toBe(true);
  });
});

describe("SEEDS v3 contract", () => {
  it("requires the current Key host without accepting aliases", () => {
    expect(checkManifest(url(), fixture(), LIVE_KEY_ORIGIN).key_host).toBe("key.seeds.honest.money");
    for (const key_host of [undefined, null, "evil.com", "seeds-key.lovable.app", "key.seeds.honest.money.evil.com"]) {
      expect(() => checkManifest(url(), { ...fixture(), key_host }, LIVE_KEY_ORIGIN)).toThrow();
    }
  });
  it("requires match code 673 for the guide challenge", () => {
    expect(checkManifest(url(), fixture(), LIVE_KEY_ORIGIN).pairing_code).toBe("673");
    for (const pairing_code of [undefined, 673, "674", "67"]) expect(() => checkManifest(url(), { ...fixture(), pairing_code }, LIVE_KEY_ORIGIN)).toThrow();
  });
  it("preserves issued-at and rejects invalid or overlong request times", () => {
    const f = fixture();
    expect(checkManifest(url(), f, LIVE_KEY_ORIGIN).issued_at).toBe(f.issued_at);
    for (const issued_at of [undefined, "bad", new Date(Date.now() + 60_001).toISOString(), new Date(Date.now() - 600_001).toISOString()]) {
      expect(() => checkManifest(url(), { ...f, issued_at }, LIVE_KEY_ORIGIN)).toThrow();
    }
  });
  it("held key changes are never signed-in success", () => {
    expect(readSubmit(200, { signed_in: false, needs_confirm: true, pocket: 1106 })).toEqual({ ok: true, signedIn: false, needsConfirm: true, pocket: 1106 });
    expect(readSubmit(200, { signed_in: false, pocket: 1106, new_account: false }).ok).toBe(false);
    expect(readSubmit(200, { signed_in: true, needs_confirm: true, pocket: 1106, new_account: false }).ok).toBe(false);
  });
  it("rejects used and expired requests without allowing another build", () => {
    expect(readSubmit(409, { error: "already used" })).toEqual(readSubmit(410, { error: "expired" }));
  });
  it("allows exactly 60 seconds of issued-at clock skew but not 60 seconds plus one millisecond", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-21T20:40:00Z"));
    const f = { ...fixture(), expires_at: new Date(Date.now() + 180_000).toISOString() };
    expect(checkManifest(url(), { ...f, issued_at: new Date(Date.now() + 60_000).toISOString() }, LIVE_KEY_ORIGIN).issued_at).toBe("2026-11-21T20:41:00.000Z");
    expect(() => checkManifest(url(), { ...f, issued_at: new Date(Date.now() + 60_001).toISOString() }, LIVE_KEY_ORIGIN)).toThrow();
  });
  it("clock tolerance does not extend expiry or the ten-minute lifetime", () => {
    vi.useFakeTimers();
    const f = fixture();
    expect(() => checkManifest(url(), { ...f, expires_at: new Date(Date.now()).toISOString() }, LIVE_KEY_ORIGIN)).toThrow();
    expect(() => checkManifest(url(), { ...f, issued_at: new Date(Date.now() - 600_000).toISOString(), expires_at: new Date(Date.now() + 1).toISOString() }, LIVE_KEY_ORIGIN)).toThrow();
  });
});
