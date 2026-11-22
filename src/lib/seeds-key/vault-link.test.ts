import { beforeEach, describe, expect, it, vi } from "vitest";
import { x25519 } from "@noble/curves/ed25519.js";
import { base64urlnopad } from "@scure/base";
import { POCKET_COINS } from "@/lib/pockets/coins";
import type { FullManifest } from "./manifest";
import { readVaultResponse, vaultRequestText, vaultSignerName } from "./vault-link";
import { buildVaultResponse, readVaultRequest } from "./vault-link-reference";
import { PartCollector, toParts } from "./qr-parts";

const PHRASE = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
beforeEach(() => vi.stubGlobal("window", { location: { origin: "https://key.seeds.honest.money", host: "key.seeds.honest.money" } }));

function manifest(): FullManifest {
  const now = Date.now();
  return {
    type: "seeds-key-signin", version: 1, domain: "seeds.honest.money", challenge_id: "a".repeat(32), challenge: "c".repeat(48),
    recipient_pubkey: base64urlnopad.encode(x25519.getPublicKey(x25519.utils.randomSecretKey())),
    submit_url: "https://seeds.honest.money/api/public/key-signin/submit", expires_at: new Date(now + 600_000).toISOString(), pocket: 1106,
    key_host: "key.seeds.honest.money", issued_at: new Date(now).toISOString(), app_name: "Seeds Exchange", origin: "https://seeds.honest.money", pairing_code: "",
  };
}

describe("HME Vault link", () => {
  it("Vault answer for pocket 1106 covers all 16 chains and is accepted", async () => {
    const m = manifest();
    const req = readVaultRequest(vaultRequestText(m));
    const h = readVaultResponse(await buildVaultResponse(req, PHRASE), m);
    expect(h.body["account"]).toBe(1106);
    expect(Object.keys(h.body["xpubs"] as object).sort()).toEqual([...POCKET_COINS].sort());
    expect(h.identity).toBe("TZZCuca5ntPVCJL5ryTjh465Jvw5vHxsVd");
    expect(vaultSignerName(h)).toContain("ZZCuca");
  });
  it("request QR carries no secrets and the Vault shows the same match code", () => {
    const m = manifest();
    const text = vaultRequestText(m);
    expect(text).not.toContain("submit_url");
    expect(readVaultRequest(text).matchCode).toBe("673");
  });
  it("Vault refuses any pocket but 1106 and any host but the live Key", () => {
    expect(() => readVaultRequest(vaultRequestText({ ...manifest(), pocket: 1107 }))).toThrow(/1106/);
    expect(() => readVaultRequest(vaultRequestText({ ...manifest(), key_host: "key.evil.com" }))).toThrow(/real Seeds Key/);
  });
  it("Key rejects an answer for another sign-in", async () => {
    const m = manifest();
    const text = await buildVaultResponse(readVaultRequest(vaultRequestText(m)), PHRASE);
    expect(() => readVaultResponse(text, { ...m, challenge_id: "b".repeat(32) })).toThrow(/different sign-in/);
  });
  it("Key rejects a swapped sealed payload", async () => {
    const m = manifest();
    const r = JSON.parse(await buildVaultResponse(readVaultRequest(vaultRequestText(m)), PHRASE));
    r.body.payload = base64urlnopad.encode(new Uint8Array(200));
    expect(() => readVaultResponse(JSON.stringify(r), m)).toThrow(/different text/);
  });
  it("Key rejects a forged signature", async () => {
    const m = manifest();
    const r = JSON.parse(await buildVaultResponse(readVaultRequest(vaultRequestText(m)), PHRASE));
    const other = JSON.parse(await buildVaultResponse(readVaultRequest(vaultRequestText(m)), "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"));
    r.signature = other.signature;
    expect(() => readVaultResponse(JSON.stringify(r), m)).toThrow(/signature/);
  });
  it("animated QR parts reassemble", async () => {
    const m = manifest();
    const text = await buildVaultResponse(readVaultRequest(vaultRequestText(m)), PHRASE);
    const parts = toParts(text, 600);
    expect(parts.length).toBeGreaterThan(1);
    const c = new PartCollector();
    let out: string | null = null;
    for (const p of [...parts].reverse()) out = c.add(p) ?? out;
    expect(readVaultResponse(out!, m).body["account"]).toBe(1106);
  });
});
