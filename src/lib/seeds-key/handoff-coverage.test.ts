import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { base64urlnopad } from "@scure/base";
import { coinSignIn } from "./flows";
import { buildHandoff } from "@/lib/key-signin/seeds-key-reference";
import { pocketKeysMatch, pocketsFromMnemonic } from "@/lib/pockets/derive";
import { POCKET_COINS, accountPath } from "@/lib/pockets/coins";
import { vaultManifest } from "@/test/vault-fixture";

// Public BIP39 vector and synthetic recipient; never a member credential.
const WORDS =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const enc = new TextEncoder();
async function openTestEnvelope(payload: string): Promise<Record<string, string>> {
  const sealed = base64urlnopad.decode(payload);
  const eph = sealed.slice(0, 32);
  const recipientSecret = new Uint8Array(32).fill(7);
  const recipient = x25519.getPublicKey(recipientSecret);
  const shared = x25519.getSharedSecret(recipientSecret, eph);
  const key = hkdf(
    sha256,
    shared,
    new Uint8Array([...eph, ...recipient]),
    enc.encode("hm-link-delegate v1"),
    32,
  );
  const cryptoKey = await crypto.subtle.importKey("raw", Uint8Array.from(key), "AES-GCM", false, [
    "decrypt",
  ]);
  const plain = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: sealed.slice(32, 44) },
      cryptoKey,
      sealed.slice(44),
    ),
  );
  try {
    return JSON.parse(new TextDecoder().decode(plain)) as Record<string, string>;
  } finally {
    plain.fill(0);
    key.fill(0);
    shared.fill(0);
    recipientSecret.fill(0);
  }
}
beforeEach(() =>
  vi.stubGlobal("window", {
    location: { origin: "https://key.seeds.honest.money", host: "key.seeds.honest.money" },
  }),
);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("existing family preservation", () => {
  it.each(["coin", "evm", "sol"] as const)(
    "%s first link and re-link seal all sixteen matching private keys at 1106",
    async (kind) => {
      const manifest = vaultManifest();
      const expected = pocketsFromMnemonic(WORDS, { account: 1106 });
      for (let link = 0; link < 2; link++) {
        const h = await buildHandoff({
          manifestUrl: `${manifest.origin}/api/public/key-signin/manifest/${manifest.challenge_id}`,
          manifest,
          words: WORDS,
          kind,
          identity:
            kind === "evm"
              ? "0x7231a79714ffD1b9f51216f79762fA38A40b4544"
              : kind === "sol"
                ? "DXTivYcF78Vznitg6f8JGXouZwsm3xioik1LGWj2H1jV"
                : "TZZCuca5ntPVCJL5ryTjh465Jvw5vHxsVd",
          account: 1106,
        });
        expect(h.body.account).toBe(1106);
        expect(h.body.paths).toEqual(POCKET_COINS.map((c) => accountPath(c, 1106)));
        const secrets = await openTestEnvelope(h.body.payload);
        expect(Object.keys(secrets).sort()).toEqual([...POCKET_COINS].sort());
        for (const coin of POCKET_COINS) {
          const secret = secrets[coin],
            pub = h.body.xpubs[coin];
          if (!secret || !pub) throw new Error("Missing test pocket family");
          expect(pocketKeysMatch(coin, secret, pub)).toBe(true);
          expect(pub).toBe(expected.xpubs[coin]);
          secrets[coin] = "";
        }
        expect(h.body.paths).toContain("m/44'/60'/1106'");
        expect(h.body.paths).toContain("m/1852'/1815'/1106'");
        expect(h.body.paths).toContain("m/44'/128'/1106'");
        expect(h.body.xpubs).not.toHaveProperty("XLM");
        expect(h.body.xpubs).not.toHaveProperty("TON");
        expect(h.body.xpubs).not.toHaveProperty("SUI");
      }
      for (const coin of POCKET_COINS) expected.xprvs[coin] = "";
    },
  );
  it("coin first link and re-link POST the full EVM/ADA/XMR bundle without recovery words", async () => {
    const posts: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        posts.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return Response.json({ signed_in: true, new_account: posts.length === 1, pocket: 1106 });
      }),
    );
    await coinSignIn(vaultManifest(), WORDS);
    await coinSignIn(vaultManifest(), WORDS);
    expect(posts).toHaveLength(2);
    for (const posted of posts) {
      expect(posted["account"]).toBe(1106);
      expect(posted["paths"]).toEqual(POCKET_COINS.map((c) => accountPath(c, 1106)));
      expect(posted).not.toHaveProperty("words");
      expect(posted).not.toHaveProperty("xprvs");
      const payload = posted["payload"];
      if (typeof payload !== "string") throw new Error("Missing test payload");
      const secrets = await openTestEnvelope(payload);
      const xpubs = posted["xpubs"] as Record<string, string>;
      for (const coin of ["EVM", "ADA", "XMR"] as const) {
        const secret = secrets[coin],
          pub = xpubs[coin];
        if (!secret || !pub) throw new Error("Missing existing test family");
        expect(pocketKeysMatch(coin, secret, pub)).toBe(true);
      }
      for (const coin of POCKET_COINS) secrets[coin] = "";
    }
  });
  it("look-alike origins are refused by the copied reference before phrase derivation", async () => {
    const manifest = vaultManifest();
    await expect(
      buildHandoff({
        manifestUrl: `https://seeds.honest.money.evil.example/api/public/key-signin/manifest/${manifest.challenge_id}`,
        manifest,
        words: "invalid phrase",
        kind: "coin",
        identity: "synthetic",
      }),
    ).rejects.toThrow(/origin_not_allowed/);
  });
});
