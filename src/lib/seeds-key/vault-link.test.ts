import { beforeEach, describe, expect, it, vi } from "vitest";
import { base64urlnopad } from "@scure/base";
import { POCKET_COINS } from "@/lib/pockets/coins";
import {
  readVaultResponse,
  vaultRequestText,
  vaultSignerName,
  submitVaultHandoff,
} from "./vault-link";
import { buildVaultResponse, readVaultRequest } from "./vault-link-reference";
import { VaultAnswerCollector } from "./vault-scan";
import { toParts } from "./qr-parts";
import { checkManifest } from "./manifest";
import { TEST_TRUST, vaultManifest } from "@/test/vault-fixture";
import { coinIdentityKey, signTxcMessage } from "@/lib/key-signin/seeds-key-reference";
import { vaultLabelMessage } from "./vault-label";

vi.mock("./vault-protocol", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./vault-protocol")>();
  const { ed25519 } = await import("@noble/curves/ed25519.js");
  const { base64urlnopad } = await import("@scure/base");
  const trust = {
    "test-only": base64urlnopad.encode(ed25519.getPublicKey(new Uint8Array(32).fill(42))),
  };
  return { ...actual, SEEDS_REQUEST_KEYS: trust };
});
const PHRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
beforeEach(() =>
  vi.stubGlobal("window", {
    location: { origin: "https://key.seeds.honest.money", host: "key.seeds.honest.money" },
  }),
);

async function answer() {
  const m = vaultManifest();
  const text = await buildVaultResponse(
    readVaultRequest(vaultRequestText(m), TEST_TRUST),
    PHRASE,
    TEST_TRUST,
  );
  return { m, text, h: readVaultResponse(text, m) };
}

async function labeledAnswer() {
  const { m, text } = await answer();
  const r = JSON.parse(text);
  const key = coinIdentityKey(PHRASE);
  try {
    r.body.vault_fingerprint = "73c5da0a";
    r.body.vault_label_signature = signTxcMessage(
      key,
      vaultLabelMessage(r.message, r.body.vault_fingerprint),
    ).signature;
  } finally {
    key.fill(0);
  }
  return { m, r, h: readVaultResponse(JSON.stringify(r), m) };
}
describe("HME Vault link", () => {
  it("uses the Vault's eight-character fingerprint without changing coin identity", async () => {
    const { h } = await labeledAnswer();
    expect(h.body["vault_fingerprint"]).toBe("73c5da0a");
    expect(h.identity).toBe("TZZCuca5ntPVCJL5ryTjh465Jvw5vHxsVd");
    expect(h.body["kind"]).toBe("coin");
    expect(h.body["account"]).toBe(1106);
  });
  it("forwards the authenticated eight-character ID and unchanged handoff to Seeds", async () => {
    const { m, h } = await labeledAnswer();
    const fetcher = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ signed_in: true, new_account: false, pocket: 1106 }),
    });
    vi.stubGlobal("fetch", fetcher);
    await submitVaultHandoff(m, h);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const call = fetcher.mock.calls[0];
    if (!call) throw new Error("Missing POST");
    const posted = JSON.parse(call[1].body);
    expect(posted.vault_fingerprint).toBe("73c5da0a");
    expect(posted.vault_label_signature).toBe(h.body["vault_label_signature"]);
    expect(posted.message).toBe(h.message);
    expect(posted.signature).toBe(h.signature);
    expect(posted.payload).toBe(h.body["payload"]);
  });
  it("refuses swapped fingerprint metadata before POST", async () => {
    const { m, h } = await labeledAnswer();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      submitVaultHandoff(m, {
        ...h,
        body: { ...h.body, vault_fingerprint: "00000000" },
      }),
    ).rejects.toThrow(/seed ID/);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses a fingerprint signature copied from another handoff", async () => {
    const { r } = await labeledAnswer();
    const { m, text } = await answer();
    const next = JSON.parse(text);
    next.body.vault_fingerprint = r.body.vault_fingerprint;
    next.body.vault_label_signature = r.body.vault_label_signature;
    // A fresh sealed envelope changes its hash, and hence its signed text.
    expect(next.message).not.toBe(r.message);
    expect(() => readVaultResponse(JSON.stringify(next), m)).toThrow(/seed ID/);
  });
  it("refuses unsigned or malformed fingerprint metadata", async () => {
    const { m, r } = await labeledAnswer();
    delete r.body.vault_label_signature;
    expect(() => readVaultResponse(JSON.stringify(r), m)).toThrow(/seed ID/);
    r.body.vault_fingerprint = "73c5da0";
    expect(() => readVaultResponse(JSON.stringify(r), m)).toThrow(/seed ID/);
  });
  it("Vault answer for pocket 1106 covers all 16 chains and is accepted", async () => {
    const { h } = await answer();
    expect(h.body["account"]).toBe(1106);
    expect(Object.keys(h.body["xpubs"] as object).sort()).toEqual([...POCKET_COINS].sort());
    expect(h.identity).toBe("TZZCuca5ntPVCJL5ryTjh465Jvw5vHxsVd");
    expect(vaultSignerName(h)).toContain("ZZCuca");
  });
  it("signed request retains signature and matching code without recovery words", () => {
    const text = vaultRequestText(vaultManifest());
    expect(text).not.toContain(PHRASE);
    expect(readVaultRequest(text, TEST_TRUST).matchCode).toBe("673");
    expect(JSON.parse(text).request_sig).toHaveLength(86);
  });
  it("Vault refuses other pockets and hosts", () => {
    expect(() => vaultRequestText({ ...vaultManifest(), pocket: 1107 })).toThrow(/match/);
    const m = vaultManifest();
    expect(() =>
      readVaultRequest(
        JSON.stringify({ ...(m.vault_request as object), key_host: "key.evil.com" }),
        TEST_TRUST,
      ),
    ).toThrow();
  });
  it("preserves the signed nested request at the manifest boundary", () => {
    const m = vaultManifest();
    expect(
      checkManifest(new URL(`${m.origin}/api/public/key-signin/manifest/${m.challenge_id}`), m)
        .vault_request,
    ).toEqual(m.vault_request);
  });
  it("no signed request means no Vault QR", () => {
    const { vault_request, ...m } = vaultManifest();
    expect(() => vaultRequestText(m)).toThrow(/signed requests/);
  });
  it("rejects a signed request from another valid challenge", () => {
    expect(() =>
      vaultRequestText({ ...vaultManifest(), challenge: "d".repeat(48), pairing_code: "278" }),
    ).toThrow();
  });
  it("coin kind restrictions also apply to Vault", () => {
    expect(() => vaultRequestText({ ...vaultManifest(), kinds: ["evm"] })).toThrow(/allow coin/);
  });
  it("Key rejects an answer for another sign-in", async () => {
    const { m, text } = await answer();
    expect(() => readVaultResponse(text, { ...m, challenge_id: "b".repeat(32) })).toThrow(
      /different sign-in/,
    );
  });
  it("Key rejects a swapped sealed payload", async () => {
    const { m, text } = await answer();
    const r = JSON.parse(text);
    r.body.payload = base64urlnopad.encode(new Uint8Array(200));
    expect(() => readVaultResponse(JSON.stringify(r), m)).toThrow(/different text/);
  });
  it("Key rejects a forged signature", async () => {
    const { m, text } = await answer();
    const r = JSON.parse(text);
    const other = JSON.parse(
      await buildVaultResponse(
        readVaultRequest(vaultRequestText(m), TEST_TRUST),
        "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong",
        TEST_TRUST,
      ),
    );
    r.signature = other.signature;
    expect(() => readVaultResponse(JSON.stringify(r), m)).toThrow(/signature/);
  });
  it("animated QR parts reassemble", async () => {
    const { m, text } = await answer();
    const parts = toParts(text, 600),
      c = new VaultAnswerCollector();
    expect(parts.length).toBeGreaterThan(1);
    let out: string | null = null;
    for (const p of [...parts].reverse()) out = c.add(p) ?? out;
    expect(out).not.toBeNull();
    if (out === null) throw new Error("Missing answer");
    expect(readVaultResponse(out, m).body["account"]).toBe(1106);
  });
  it("posts once and reads the held-confirmation result", async () => {
    const { m, h } = await answer();
    const fetcher = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ signed_in: false, needs_confirm: true, pocket: 1106 }),
    });
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    expect(await submitVaultHandoff(m, h, signal)).toEqual({
      ok: true,
      signedIn: false,
      needsConfirm: true,
      pocket: 1106,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1].signal).toBe(signal);
  });
  it("cancellation before POST sends nothing", async () => {
    const { m, h } = await answer();
    const c = new AbortController();
    c.abort();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(submitVaultHandoff(m, h, c.signal)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("a Seeds rejection never rewrites the Vault signature or retries the handoff", async () => {
    const { m, h } = await answer();
    const fetcher = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({ error: "cannot open payload", expected: "untrusted replacement text" }),
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(submitVaultHandoff(m, h)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const call = fetcher.mock.calls[0];
    if (!call) throw new Error("Missing POST");
    const posted = JSON.parse(call[1].body);
    expect(posted.message).toBe(h.message);
    expect(posted.signature).toBe(h.signature);
    expect(posted.payload).toBe(h.body["payload"]);
  });
  it("cancellation after a response cannot show success", async () => {
    const { m, h } = await answer();
    const c = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        c.abort();
        return {
          status: 200,
          json: async () => ({ signed_in: true, new_account: false, pocket: 1106 }),
        };
      }),
    );
    await expect(submitVaultHandoff(m, h, c.signal)).rejects.toThrow();
  });
  it("rechecks answer before POST", async () => {
    const { m, h } = await answer();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(submitVaultHandoff(m, { ...h, signature: "bad" })).rejects.toThrow(/signature/);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
