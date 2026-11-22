import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { base58, base64urlnopad, hex } from "@scure/base";
import { keySigninMessage, shortKeyName, walletPocketMessage } from "@/lib/key-signin/rules";
import { signSolanaText, walletSignIn } from "./flows";
import type { FullManifest } from "./manifest";

const EVM_ADDRESS = "0x2c7536E3605D9C16a7a3D7b1898e529396a65c23";
// Public build-guide test key, never a member credential.
const EVM_KEY = hex.decode("4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318");
const SOL_KEY = new Uint8Array(32).fill(7);
const SOL_ADDRESS = base58.encode(ed25519.getPublicKey(SOL_KEY));
const enc = new TextEncoder();
function personalSign(text: string): string {
  const bytes = enc.encode(text);
  const prefix = enc.encode(`\u0019Ethereum Signed Message:\n${bytes.length}`);
  const sig = secp256k1.sign(keccak_256(new Uint8Array([...prefix, ...bytes])), EVM_KEY, {
    prehash: false,
    format: "recovered",
  });
  return "0x" + hex.encode(new Uint8Array([...sig.slice(1), (sig[0] ?? 0) + 27]));
}
function fixture(): FullManifest {
  return {
    type: "seeds-key-signin",
    version: 1,
    domain: "seeds.honest.money",
    origin: "https://seeds.honest.money",
    app_name: "Seeds Exchange",
    challenge_id: "a".repeat(32),
    challenge: "c".repeat(48),
    pairing_code: "673",
    key_host: "key.seeds.honest.money",
    recipient_pubkey: base64urlnopad.encode(x25519.getPublicKey(new Uint8Array(32).fill(3))),
    issued_at: new Date(Date.now() - 1000).toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    submit_url: "https://seeds.honest.money/api/public/key-signin/submit",
    pocket: 1106,
  };
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

it("the guide's deterministic personal-sign vector matches exactly", () => {
  expect(personalSign(walletPocketMessage("key.example", "evm", EVM_ADDRESS))).toBe(
    "0xfb124074c5b142a7fd343341e1b7b0daab2d21761635b82c52e43dbaf9d6d88709a5754319c0595ec99cf2d791c3ee3e02786934a05147f1c79866f3cde4a4511c",
  );
});

it("EVM signs the new host-bound handoff and returns a held change without success", async () => {
  const messages: string[] = [];
  const request = vi.fn(async ({ method, params }: { method: string; params?: unknown[] }) => {
    if (method === "eth_requestAccounts") return [EVM_ADDRESS];
    const message = new TextDecoder().decode(hex.decode(String(params?.[0]).slice(2)));
    messages.push(message);
    return personalSign(message);
  });
  vi.stubGlobal("window", {
    location: { origin: "https://key.seeds.honest.money", host: "key.seeds.honest.money" },
    ethereum: { request },
  });
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ signed_in: false, needs_confirm: true, pocket: 1106 }));
  vi.stubGlobal("fetch", fetcher);
  const identity = vi.fn();
  await expect(walletSignIn(fixture(), "evm", vi.fn(), identity)).resolves.toMatchObject({
    signedIn: false,
    needsConfirm: true,
    pocket: 1106,
  });
  expect(messages).toHaveLength(3);
  expect(messages[0]).toBe(walletPocketMessage("key.seeds.honest.money", "evm", EVM_ADDRESS));
  expect(messages[1]).toBe(messages[0]);
  expect(messages[2]).toContain("Nonce: " + "c".repeat(48));
  expect(messages[2]).toContain(
    "Resources:\n- https://seeds.honest.money\n- urn:seeds:pocket:1106",
  );
  expect(identity).toHaveBeenCalledWith(shortKeyName("evm", EVM_ADDRESS));
  const posted = JSON.parse(fetcher.mock.calls[0]?.[1].body ?? "{}");
  expect(posted.message).toBe(messages[2]);
  expect(posted).not.toHaveProperty("words");
  expect(posted).not.toHaveProperty("xprvs");
  expect(base64urlnopad.decode(posted.payload).length).toBeGreaterThan(60);
});

it("rejects a wrong host before opening any wallet", async () => {
  const request = vi.fn();
  vi.stubGlobal("window", {
    location: { origin: "https://key.seeds.honest.money", host: "key.seeds.honest.money" },
    ethereum: { request },
  });
  await expect(
    walletSignIn({ ...fixture(), key_host: "evil.com" }, "evm", vi.fn()),
  ).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});

it("Phantom native sign-in is preferred for all three exact messages", async () => {
  const signIn = vi.fn(async (input) => {
    const message = [
      `${input.domain} wants you to sign in with your Solana account:`,
      input.address,
      "",
      input.statement,
      "",
      `URI: ${input.uri}`,
      `Version: ${input.version}`,
      `Chain ID: ${input.chainId}`,
      `Nonce: ${input.nonce}`,
      `Issued At: ${input.issuedAt}`,
      ...(input.expirationTime ? [`Expiration Time: ${input.expirationTime}`] : []),
      ...(input.resources ? ["Resources:", ...input.resources.map((r: string) => `- ${r}`)] : []),
    ].join("\n");
    return {
      signedMessage: enc.encode(message),
      signature: ed25519.sign(enc.encode(message), SOL_KEY),
    };
  });
  const signMessage = vi.fn();
  vi.stubGlobal("window", {
    location: { origin: "https://key.seeds.honest.money", host: "key.seeds.honest.money" },
    phantom: {
      solana: {
        connect: async () => ({
          publicKey: { toBytes: () => ed25519.getPublicKey(SOL_KEY), toString: () => SOL_ADDRESS },
        }),
        signIn,
        signMessage,
      },
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ signed_in: true, pocket: 1106, new_account: false })),
  );
  await expect(walletSignIn(fixture(), "sol", vi.fn())).resolves.toMatchObject({
    signedIn: true,
    pocket: 1106,
  });
  expect(signIn).toHaveBeenCalledTimes(3);
  expect(signMessage).not.toHaveBeenCalled();
  expect(signIn.mock.calls[2]?.[0]).toMatchObject({
    domain: "key.seeds.honest.money",
    address: SOL_ADDRESS,
    nonce: "c".repeat(48),
    resources: expect.arrayContaining(["urn:seeds:pocket:1106"]),
  });
});

it("Phantom formatting changes are discarded before the exact-text fallback", async () => {
  const signature = new Uint8Array(64).fill(9);
  const signMessage = vi.fn(async (bytes: Uint8Array) => ({
    signature: ed25519.sign(bytes, SOL_KEY),
  }));
  const message = walletPocketMessage("key.seeds.honest.money", "sol", SOL_ADDRESS);
  const result = await signSolanaText(
    {
      signIn: async () => ({ signedMessage: enc.encode("different text"), signature }),
      signMessage,
    },
    message,
    vi.fn(),
  );
  expect(signature.every((byte) => byte === 0)).toBe(true);
  expect(signMessage).toHaveBeenCalledWith(enc.encode(message), "utf8");
  expect(ed25519.verify(result, enc.encode(message), ed25519.getPublicKey(SOL_KEY))).toBe(true);
});

it("Phantom without signIn signs exact bytes through the fallback", async () => {
  const message = walletPocketMessage("key.seeds.honest.money", "sol", SOL_ADDRESS);
  const signMessage = vi.fn(async (bytes: Uint8Array) => ({
    signature: ed25519.sign(bytes, SOL_KEY),
  }));
  const result = await signSolanaText({ signMessage }, message, vi.fn());
  expect(signMessage).toHaveBeenCalledWith(enc.encode(message), "utf8");
  expect(ed25519.verify(result, enc.encode(message), ed25519.getPublicKey(SOL_KEY))).toBe(true);
});

it("wallet handoff messages bind both request timestamps and expiration", () => {
  const m = fixture();
  const message = keySigninMessage({
    domain: m.domain,
    challenge: m.challenge,
    kind: "sol",
    identity: SOL_ADDRESS,
    account: 1106,
    paths: [],
    payloadSha: "aa",
    keyHost: m.key_host ?? "",
    issuedAt: m.issued_at,
    expiresAt: m.expires_at,
  });
  expect(message).toContain(`Issued At: ${m.issued_at}\nExpiration Time: ${m.expires_at}`);
});

it("native SIWS receives every exact handoff field including ordered resources", async () => {
  const message = keySigninMessage({
    domain: "seeds.honest.money",
    challenge: "c".repeat(48),
    kind: "sol",
    identity: SOL_ADDRESS,
    account: 1106,
    paths: ["m/44'/696969'/1106'/0/0"],
    payloadSha: "a".repeat(64),
    keyHost: "key.seeds.honest.money",
    issuedAt: "2026-11-21T20:40:00.000Z",
    expiresAt: "2026-11-21T20:50:00.000Z",
  });
  const signIn = vi.fn(async () => ({
    signedMessage: enc.encode(message),
    signature: ed25519.sign(enc.encode(message), SOL_KEY),
  }));
  await signSolanaText({ signIn, signMessage: vi.fn() }, message, vi.fn());
  expect(signIn).toHaveBeenCalledWith({
    domain: "key.seeds.honest.money",
    address: SOL_ADDRESS,
    statement:
      "Sign in to Seeds (seeds.honest.money) and give it the keys to trading pocket 1106 only, until I revoke. Signing in moves nothing. Only sign this on key.seeds.honest.money.",
    uri: "https://key.seeds.honest.money",
    version: "1",
    chainId: "mainnet",
    nonce: "c".repeat(48),
    issuedAt: "2026-11-21T20:40:00.000Z",
    expirationTime: "2026-11-21T20:50:00.000Z",
    resources: [
      "https://seeds.honest.money",
      "urn:seeds:pocket:1106",
      "urn:seeds:path:m/44'/696969'/1106'/0/0",
      `urn:seeds:payload-sha256:${"a".repeat(64)}`,
    ],
  });
});
