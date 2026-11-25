import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { base64urlnopad } from "@scure/base";
import {
  allowedManifestUrl,
  checkManifest,
  loadManifest,
  readSubmit,
  seedsReturnUrl,
  submitWithRetry,
} from "./manifest";
import { pairingCode } from "@/lib/key-signin/rules";
import {
  KEY_PREVIEW_ORIGIN,
  LIVE_KEY_ORIGIN,
  SEEDS_ORIGIN,
  SEEDS_PREVIEW_ORIGIN,
  seedsOrigins,
} from "./policy";

const TOKEN = "a".repeat(32);
const url = (origin = SEEDS_ORIGIN) => new URL(`${origin}/api/public/key-signin/manifest/${TOKEN}`);
const fixture = (origin = SEEDS_ORIGIN, keyOrigin = LIVE_KEY_ORIGIN) => ({
  type: "seeds-key-signin",
  version: 1,
  domain: new URL(origin).host,
  challenge_id: TOKEN,
  challenge: "c".repeat(48),
  recipient_pubkey: base64urlnopad.encode(new Uint8Array(32).fill(1)),
  submit_url: `${origin}/api/public/key-signin/submit`,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  pocket: 1106,
  kinds: ["coin", "evm", "sol"],
  key_host: new URL(keyOrigin).host,
  issued_at: new Date(Date.now() - 1000).toISOString(),
  pairing_code: pairingCode("c".repeat(48)),
});
beforeEach(() =>
  vi.stubGlobal("window", {
    location: { origin: LIVE_KEY_ORIGIN, host: new URL(LIVE_KEY_ORIGIN).host },
  }),
);
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("deployment trust boundaries", () => {
  it("production and the published alias accept only production SEEDS", () => {
    expect(seedsOrigins(LIVE_KEY_ORIGIN)).toEqual([SEEDS_ORIGIN]);
    expect(seedsOrigins("https://seeds-key.lovable.app")).toEqual([SEEDS_ORIGIN]);
    expect(allowedManifestUrl(url(SEEDS_PREVIEW_ORIGIN).href, LIVE_KEY_ORIGIN)).toBeNull();
  });
  it("only the designated Key preview and local development trust SEEDS preview", () => {
    expect(allowedManifestUrl(url(SEEDS_PREVIEW_ORIGIN).href, KEY_PREVIEW_ORIGIN)?.origin).toBe(
      SEEDS_PREVIEW_ORIGIN,
    );
    expect(seedsOrigins("http://localhost:8080")).toEqual([SEEDS_PREVIEW_ORIGIN]);
    expect(seedsOrigins(KEY_PREVIEW_ORIGIN)).toEqual([SEEDS_PREVIEW_ORIGIN]);
    expect(
      allowedManifestUrl(url(SEEDS_PREVIEW_ORIGIN).href, "https://unexpected.lovable.app"),
    ).toBeNull();
  });
  it.each([KEY_PREVIEW_ORIGIN, "http://localhost:8080"])(
    "%s rejects production before fetching a manifest",
    async (origin) => {
      vi.stubGlobal("window", { location: { origin, host: new URL(origin).host } });
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      expect(allowedManifestUrl(url().href, origin)).toBeNull();
      expect(() => checkManifest(url(), fixture(SEEDS_ORIGIN, origin), origin)).toThrow();
      await expect(loadManifest(url().href)).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each([KEY_PREVIEW_ORIGIN, "http://localhost:8080"])(
    "%s rechecks isolation before key work and POST",
    async (origin) => {
      vi.stubGlobal("window", { location: { origin, host: new URL(origin).host } });
      const build = vi.fn(),
        sign = vi.fn(),
        fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      const m = checkManifest(url(), fixture(), LIVE_KEY_ORIGIN);
      await expect(
        submitWithRetry({ ...m, key_host: new URL(origin).host }, build, sign),
      ).rejects.toThrow();
      expect(build).not.toHaveBeenCalled();
      expect(sign).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("rejects look-alike origins, credentials and non-protocol paths", () => {
    for (const address of [
      `https://seeds.honest.money.evil.com${url().pathname}`,
      `http://seeds.honest.money${url().pathname}`,
      `https://attacker@seeds.honest.money${url().pathname}`,
      `${SEEDS_ORIGIN}/other/${TOKEN}`,
      `${url().href}?next=evil`,
      `${url().href}#evil`,
    ])
      expect(allowedManifestUrl(address, LIVE_KEY_ORIGIN)).toBeNull();
  });
});

describe("manifest identity and protocol validation", () => {
  it("ignores spoofed branding and return origin in otherwise legitimate JSON", () => {
    const m = checkManifest(
      url(),
      { ...fixture(), origin: "https://evil.com", app_name: "Attacker" },
      LIVE_KEY_ORIGIN,
    );
    expect(m.origin).toBe(SEEDS_ORIGIN);
    expect(m.app_name).toBe("Seeds Exchange");
  });
  it("rejects a preview manifest relaying a production signed domain", () => {
    expect(() =>
      checkManifest(
        url(SEEDS_PREVIEW_ORIGIN),
        { ...fixture(SEEDS_PREVIEW_ORIGIN, KEY_PREVIEW_ORIGIN), domain: "seeds.honest.money" },
        KEY_PREVIEW_ORIGIN,
      ),
    ).toThrow();
  });
  it("refuses SEEDS preview requests since SEEDS removed preview trust (2026-11-25)", () => {
    expect(() =>
      checkManifest(
        url(SEEDS_PREVIEW_ORIGIN),
        fixture(SEEDS_PREVIEW_ORIGIN, KEY_PREVIEW_ORIGIN),
        KEY_PREVIEW_ORIGIN,
      ),
    ).toThrow();
  });
  it("requires the exact same-origin submit endpoint", () => {
    for (const endpoint of [
      "https://evil.com/submit",
      `${SEEDS_ORIGIN}/other`,
      `${SEEDS_ORIGIN}/api/public/key-signin/submit?next=evil`,
    ]) {
      expect(() =>
        checkManifest(url(), { ...fixture(), submit_url: endpoint }, LIVE_KEY_ORIGIN),
      ).toThrow();
    }
  });
  it("matches the challenge ID to the URL", () => {
    expect(() =>
      checkManifest(url(), { ...fixture(), challenge_id: "b".repeat(32) }, LIVE_KEY_ORIGIN),
    ).toThrow();
  });
  it("rejects malformed types and unusable recipient keys", () => {
    for (const value of [
      null,
      [],
      { ...fixture(), challenge: {} },
      { ...fixture(), recipient_pubkey: 42 },
      { ...fixture(), recipient_pubkey: base64urlnopad.encode(new Uint8Array(32)) },
      { ...fixture(), kinds: ["unknown"] },
    ]) {
      expect(() => checkManifest(url(), value, LIVE_KEY_ORIGIN)).toThrow();
    }
  });
  it("accepts only trading pocket 1106", () => {
    for (const pocket of [1106])
      expect(checkManifest(url(), { ...fixture(), pocket }, LIVE_KEY_ORIGIN).pocket).toBe(pocket);
    for (const pocket of [0, 1105, 1107, 2105, 2106, 1106.5, "1106", NaN])
      expect(() => checkManifest(url(), { ...fixture(), pocket }, LIVE_KEY_ORIGIN)).toThrow();
  });
  it("rejects missing, invalid and expired timestamps, including expiry at the current instant", () => {
    for (const expires_at of [
      undefined,
      "not-a-date",
      new Date(Date.now() - 1).toISOString(),
      new Date(Date.now()).toISOString(),
    ]) {
      expect(() => checkManifest(url(), { ...fixture(), expires_at }, LIVE_KEY_ORIGIN)).toThrow();
    }
  });
  it("keeps coin and wallet return choices on the verified origin", () => {
    const m = checkManifest(url(), fixture(SEEDS_ORIGIN, LIVE_KEY_ORIGIN), LIVE_KEY_ORIGIN);
    expect(seedsReturnUrl(m, "coin")).toBe(`${SEEDS_ORIGIN}/key-signin?kind=coin`);
    expect(seedsReturnUrl(m, "wallet")).toBe(`${SEEDS_ORIGIN}/key-signin?kind=wallet`);
    expect(() => seedsReturnUrl({ ...m, origin: "https://evil.com" }, "coin")).toThrow();
  });
});

describe("fetch and handoff boundaries", () => {
  it("forbids redirects and cookies on manifest reads", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json(fixture(SEEDS_ORIGIN, LIVE_KEY_ORIGIN)));
    vi.stubGlobal("fetch", fetcher);
    const m = await loadManifest(url().href);
    expect(m.origin).toBe(SEEDS_ORIGIN);
    expect(fetcher).toHaveBeenCalledWith(
      url().href,
      expect.objectContaining({ redirect: "error", credentials: "omit", cache: "no-store" }),
    );
  });
  it("refuses malformed success and retry responses", () => {
    for (const value of [
      null,
      [],
      { pocket: "1106", new_account: false },
      { pocket: 0, new_account: false },
      { pocket: 1106, new_account: "yes" },
    ]) {
      expect(readSubmit(200, value).ok).toBe(false);
    }
    for (const account of [0, 1107, 2105, 2106, "1106", 1106.5])
      expect(readSubmit(409, { error: "use_pocket", account })).not.toHaveProperty("usePocket");
    expect(readSubmit(200, { pocket: 2105, signed_in: true, new_account: false }).ok).toBe(false);
    expect(readSubmit(200, { pocket: 1107, signed_in: false, needs_confirm: true }).ok).toBe(false);
  });
  it("does no key building or signing for an expired request", async () => {
    const m = checkManifest(url(), fixture(SEEDS_ORIGIN, LIVE_KEY_ORIGIN), LIVE_KEY_ORIGIN);
    m.expires_at = new Date(Date.now() - 1).toISOString();
    const build = vi.fn(),
      sign = vi.fn(),
      fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(submitWithRetry(m, build, sign)).rejects.toThrow();
    expect(build).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rechecks expiry after wallet approval before posting", async () => {
    vi.useFakeTimers();
    const m = checkManifest(url(), fixture(SEEDS_ORIGIN, LIVE_KEY_ORIGIN), LIVE_KEY_ORIGIN);
    const build = vi.fn().mockResolvedValue({ message: "synthetic test", body: { account: 1106 } });
    const sign = vi.fn().mockImplementation(async () => {
      vi.advanceTimersByTime(60_001);
      return "synthetic";
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(submitWithRetry(m, build, sign)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([1107, 2105])(
    "never rebuilds or sends a second handoff for pocket %s",
    async (account) => {
      const m = checkManifest(url(), fixture(), LIVE_KEY_ORIGIN);
      const build = vi
        .fn()
        .mockResolvedValue({ message: "synthetic test", body: { account: 1106 } });
      const sign = vi.fn().mockResolvedValue("synthetic");
      const fetcher = vi
        .fn()
        .mockResolvedValue(Response.json({ error: "use_pocket", account }, { status: 409 }));
      vi.stubGlobal("fetch", fetcher);
      await expect(submitWithRetry(m, build, sign)).rejects.toThrow(/pocket/);
      expect(build).toHaveBeenCalledExactlyOnceWith(1106);
      expect(sign).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("does not silently repeat a handoff even for a 1106 retry", async () => {
    const m = checkManifest(url(), fixture(), LIVE_KEY_ORIGIN);
    const build = vi.fn().mockResolvedValue({ message: "synthetic test", body: { account: 1106 } });
    const sign = vi.fn().mockResolvedValue("synthetic");
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ error: "use_pocket", account: 1106 }, { status: 409 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(submitWithRetry(m, build, sign)).rejects.toThrow(/rebuild/);
    expect(build).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("refuses a builder's alternative pocket before signing or posting", async () => {
    const m = checkManifest(url(), fixture(), LIVE_KEY_ORIGIN);
    const build = vi.fn().mockResolvedValue({ message: "synthetic test", body: { account: 1107 } });
    const sign = vi.fn(),
      fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(submitWithRetry(m, build, sign)).rejects.toThrow(/1106/);
    expect(sign).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
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
    expect(checkManifest(url(), fixture(), LIVE_KEY_ORIGIN).key_host).toBe(
      "key.seeds.honest.money",
    );
    for (const key_host of [
      undefined,
      null,
      "evil.com",
      "seeds-key.lovable.app",
      "key.seeds.honest.money.evil.com",
    ]) {
      expect(() => checkManifest(url(), { ...fixture(), key_host }, LIVE_KEY_ORIGIN)).toThrow();
    }
  });
  it("requires match code 673 for the guide challenge", () => {
    expect(checkManifest(url(), fixture(), LIVE_KEY_ORIGIN).pairing_code).toBe("673");
    for (const pairing_code of [undefined, 673, "674", "67"])
      expect(() => checkManifest(url(), { ...fixture(), pairing_code }, LIVE_KEY_ORIGIN)).toThrow();
  });
  it("preserves issued-at and rejects invalid or overlong request times", () => {
    const f = fixture();
    expect(checkManifest(url(), f, LIVE_KEY_ORIGIN).issued_at).toBe(f.issued_at);
    for (const issued_at of [
      undefined,
      "bad",
      new Date(Date.now() + 60_001).toISOString(),
      new Date(Date.now() - 600_001).toISOString(),
    ]) {
      expect(() => checkManifest(url(), { ...f, issued_at }, LIVE_KEY_ORIGIN)).toThrow();
    }
  });
  it("held key changes are never signed-in success", () => {
    expect(readSubmit(200, { signed_in: false, needs_confirm: true, pocket: 1106 })).toEqual({
      ok: true,
      signedIn: false,
      needsConfirm: true,
      pocket: 1106,
    });
    expect(readSubmit(200, { signed_in: false, pocket: 1106, new_account: false }).ok).toBe(false);
    expect(
      readSubmit(200, { signed_in: true, needs_confirm: true, pocket: 1106, new_account: false })
        .ok,
    ).toBe(false);
  });
  it("rejects used and expired requests without allowing another build", () => {
    expect(readSubmit(409, { error: "already used" })).toEqual(
      readSubmit(410, { error: "expired" }),
    );
  });
  it("allows exactly 60 seconds of issued-at clock skew but not 60 seconds plus one millisecond", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T20:40:00Z"));
    const f = { ...fixture(), expires_at: new Date(Date.now() + 180_000).toISOString() };
    expect(
      checkManifest(
        url(),
        { ...f, issued_at: new Date(Date.now() + 60_000).toISOString() },
        LIVE_KEY_ORIGIN,
      ).issued_at,
    ).toBe("2026-11-21T20:41:00.000Z");
    expect(() =>
      checkManifest(
        url(),
        { ...f, issued_at: new Date(Date.now() + 60_001).toISOString() },
        LIVE_KEY_ORIGIN,
      ),
    ).toThrow();
  });
  it("clock tolerance does not extend expiry or the ten-minute lifetime", () => {
    vi.useFakeTimers();
    const f = fixture();
    expect(() =>
      checkManifest(
        url(),
        { ...f, expires_at: new Date(Date.now()).toISOString() },
        LIVE_KEY_ORIGIN,
      ),
    ).toThrow();
    expect(() =>
      checkManifest(
        url(),
        {
          ...f,
          issued_at: new Date(Date.now() - 600_000).toISOString(),
          expires_at: new Date(Date.now() + 1).toISOString(),
        },
        LIVE_KEY_ORIGIN,
      ),
    ).toThrow();
  });
});
