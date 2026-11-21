import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { base64urlnopad, hex } from "@scure/base";
import { walletPocketMessage } from "@/lib/key-signin/rules";
import { checkedLedgerPath, DEFAULT_LEDGER_PATH, ledgerCapabilities, ledgerPersonalSignature, ledgerSignIn, type LedgerSession, type PreparedLedger } from "./ledger";
import type { FullManifest } from "./manifest";

const ADDRESS = "0x2c7536e3605d9c16a7a3d7b1898e529396a65c23";
// Public SEEDS guide test key; not a hardware or member key.
const KEY = hex.decode("4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318");
function fixture(): FullManifest {
  return { type: "seeds-key-signin", version: 1, domain: "seeds.honest.money", origin: "https://seeds.honest.money", app_name: "Seeds Exchange",
    challenge_id: "a".repeat(32), challenge: "c".repeat(48), pairing_code: "673", key_host: "localhost:8080", pocket: 1106, kinds: ["evm"],
    issued_at: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 60_000).toISOString(),
    recipient_pubkey: base64urlnopad.encode(x25519.getPublicKey(new Uint8Array(32).fill(3))), submit_url: "https://seeds.honest.money/api/public/key-signin/submit" };
}
function signature(messageHex: string) {
  const bytes = hex.decode(messageHex);
  const prefix = new TextEncoder().encode(`\u0019Ethereum Signed Message:\n${bytes.length}`);
  const signed = secp256k1.sign(keccak_256(new Uint8Array([...prefix, ...bytes])), KEY, { prehash: false, format: "recovered" });
  return { r: hex.encode(signed.slice(1, 33)), s: hex.encode(signed.slice(33)), v: (signed[0] ?? 0) + 27 };
}
function device() {
  const close = vi.fn(async () => {}), remove = vi.fn();
  let disconnected: (() => void) | undefined;
  const signPersonalMessage = vi.fn(async (_path: string, text: string) => signature(text));
  const getAddress = vi.fn(async () => ({ address: ADDRESS, publicKey: "" }));
  const session: LedgerSession = { eth: { getAddress, signPersonalMessage }, close, onDisconnect: (listener) => { disconnected = listener; return remove; } };
  const prepared: PreparedLedger = { open: vi.fn(async () => session) };
  return { prepared, close, remove, getAddress, signPersonalMessage, disconnect: () => disconnected?.() };
}
beforeEach(() => {
  vi.stubGlobal("window", { location: { origin: "http://localhost:8080", host: "localhost:8080" }, isSecureContext: true });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ signed_in: false, needs_confirm: true, pocket: 1106 })));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it.each(["hid", "ble"] as const)("%s confirms the address and signs three exact EVM messages, then closes", async (kind) => {
  const d = device();
  const result = await ledgerSignIn(fixture(), d.prepared, kind, DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), new AbortController().signal);
  expect(result).toMatchObject({ signedIn: false, needsConfirm: true, pocket: 1106 });
  expect(d.prepared.open).toHaveBeenCalledWith(kind);
  expect(d.getAddress).toHaveBeenCalledWith("44'/60'/0'/0/0", true, false);
  expect(d.signPersonalMessage).toHaveBeenCalledTimes(3);
  const messages = d.signPersonalMessage.mock.calls.map((call) => new TextDecoder().decode(hex.decode(call[1])));
  expect(messages[0]).toBe(walletPocketMessage("localhost:8080", "evm", ADDRESS));
  expect(messages[1]).toBe(messages[0]); expect(messages[2]).toContain("Nonce: " + "c".repeat(48));
  expect(d.close).toHaveBeenCalledTimes(1); expect(d.remove).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("Ledger recovery-byte formatting preserves the guide personal-sign vector", () => {
  const text = walletPocketMessage("key.example", "evm", ADDRESS);
  expect(ledgerPersonalSignature(signature(hex.encode(new TextEncoder().encode(text))))).toBe("0xfb124074c5b142a7fd343341e1b7b0daab2d21761635b82c52e43dbaf9d6d88709a5754319c0595ec99cf2d791c3ee3e02786934a05147f1c79866f3cde4a4511c");
  for (const v of [0, 1, 29, 255]) expect(() => ledgerPersonalSignature({ r: "a".repeat(64), s: "b".repeat(64), v })).toThrow();
  expect(() => ledgerPersonalSignature({ r: "z".repeat(64), s: "b".repeat(64), v: 27 })).toThrow();
});

it("accepts Ethereum Ledger Live and legacy paths but not other networks or overflowing indexes", () => {
  expect(checkedLedgerPath(DEFAULT_LEDGER_PATH)).toBe("44'/60'/0'/0/0");
  expect(checkedLedgerPath("m/44'/60'/2'/0/5")).toBe("44'/60'/2'/0/5");
  expect(checkedLedgerPath("44'/60'/0'/7")).toBe("44'/60'/0'/7");
  for (const path of ["m/44'/0'/0'/0/0", "m/44'/60'/2147483648'/0/0", "m/44'/60'/0'/0'/0", "bad", "m/44'/60'/0'/0/-1"]) expect(() => checkedLedgerPath(path)).toThrow();
});

it("invalid host, expired request, disallowed wallet and invalid path never open the device picker", async () => {
  const d = device();
  const invalid: FullManifest[] = [{ ...fixture(), key_host: "evil.com" }, { ...fixture(), expires_at: new Date(0).toISOString() }, { ...fixture(), kinds: ["coin"] }];
  for (const m of invalid) {
    await expect(ledgerSignIn(m, d.prepared, "hid", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), new AbortController().signal)).rejects.toThrow();
  }
  await expect(ledgerSignIn(fixture(), d.prepared, "hid", "bad", vi.fn(), vi.fn(), new AbortController().signal)).rejects.toThrow();
  expect(d.prepared.open).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});

it("device rejection closes the connection without submitting", async () => {
  const d = device(); d.signPersonalMessage.mockRejectedValueOnce(new Error("Rejected on Ledger"));
  await expect(ledgerSignIn(fixture(), d.prepared, "ble", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), new AbortController().signal)).rejects.toThrow("Rejected on Ledger");
  expect(d.close).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
});

it("nonrepeatable device signatures cannot create a pocket", async () => {
  const d = device();
  d.signPersonalMessage.mockImplementationOnce(async (_path, text) => signature(text)).mockImplementationOnce(async () => ({ r: "a".repeat(64), s: "b".repeat(64), v: 27 }));
  await expect(ledgerSignIn(fixture(), d.prepared, "hid", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), new AbortController().signal)).rejects.toThrow("two different signatures");
  expect(d.close).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
});

it("cancelling during device approval prevents even a late successful signature from posting", async () => {
  const d = device(), active = new AbortController();
  d.signPersonalMessage.mockImplementationOnce(async (_path, text) => { active.abort(); return signature(text); });
  await expect(ledgerSignIn(fixture(), d.prepared, "hid", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), active.signal)).rejects.toThrow();
  expect(d.close).toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(d.signPersonalMessage).toHaveBeenCalledTimes(1);
});

it("a disconnected device cannot submit a returned signature", async () => {
  const d = device(); d.signPersonalMessage.mockImplementationOnce(async (_path, text) => { d.disconnect(); return signature(text); });
  await expect(ledgerSignIn(fixture(), d.prepared, "ble", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), new AbortController().signal)).rejects.toThrow("disconnected");
  expect(d.close).toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});

it("expiry during device approval stays strict and prevents submission", async () => {
  vi.useFakeTimers(); const d = device();
  d.signPersonalMessage.mockImplementationOnce(async (_path, text) => { vi.advanceTimersByTime(60_001); return signature(text); });
  await expect(ledgerSignIn(fixture(), d.prepared, "hid", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), new AbortController().signal)).rejects.toThrow("expired");
  expect(d.close).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
});

it("detects browser APIs only in a secure context", () => {
  vi.stubGlobal("navigator", { hid: {}, bluetooth: {} });
  expect(ledgerCapabilities()).toEqual({ hid: true, ble: true });
  vi.stubGlobal("window", { isSecureContext: false });
  expect(ledgerCapabilities()).toEqual({ hid: false, ble: false });
});

it("completes all three signatures without native AbortSignal.any", async () => {
  vi.stubGlobal("AbortSignal", { any: undefined });
  const d = device();
  const result = await ledgerSignIn(fixture(), d.prepared, "hid", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), new AbortController().signal);
  expect(result).toMatchObject({ signedIn: false, needsConfirm: true, pocket: 1106 });
  expect(d.signPersonalMessage).toHaveBeenCalledTimes(3);
  expect(d.close).toHaveBeenCalledTimes(1); expect(d.remove).toHaveBeenCalledTimes(1);
});

it("cancellation without native AbortSignal.any closes and prevents a late signature posting", async () => {
  vi.stubGlobal("AbortSignal", { any: undefined });
  const d = device(), caller = new AbortController();
  const remove = vi.spyOn(caller.signal, "removeEventListener");
  d.signPersonalMessage.mockImplementationOnce(async (_path, text) => { caller.abort(); return signature(text); });
  await expect(ledgerSignIn(fixture(), d.prepared, "hid", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), caller.signal)).rejects.toThrow();
  expect(d.close).toHaveBeenCalled(); expect(d.remove).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  expect(d.signPersonalMessage).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
});

it("disconnect without native AbortSignal.any closes and prevents a late signature posting", async () => {
  vi.stubGlobal("AbortSignal", { any: undefined });
  const d = device();
  d.signPersonalMessage.mockImplementationOnce(async (_path, text) => { d.disconnect(); return signature(text); });
  await expect(ledgerSignIn(fixture(), d.prepared, "ble", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), new AbortController().signal)).rejects.toThrow("disconnected");
  expect(d.close).toHaveBeenCalled(); expect(d.remove).toHaveBeenCalledTimes(1);
  expect(d.signPersonalMessage).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
});

it("disconnect-listener setup failure still closes the opened transport", async () => {
  const d = device();
  const session = await d.prepared.open("hid");
  session.onDisconnect = () => { throw new Error("Listener setup failed"); };
  const caller = new AbortController(), remove = vi.spyOn(caller.signal, "removeEventListener");
  await expect(ledgerSignIn(fixture(), d.prepared, "hid", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), caller.signal)).rejects.toThrow("Listener setup failed");
  expect(d.close).toHaveBeenCalledTimes(1); expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  expect(d.getAddress).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});

it("disconnect-listener cleanup failure cannot skip closing the transport", async () => {
  const d = device();
  d.getAddress.mockRejectedValueOnce(new Error("Address rejected"));
  d.remove.mockImplementationOnce(() => { throw new Error("Listener cleanup failed"); });
  await expect(ledgerSignIn(fixture(), d.prepared, "hid", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), new AbortController().signal)).rejects.toThrow("Listener cleanup failed");
  expect(d.close).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
});

it("cancelling while the picker is pending closes its late session without requesting an address", async () => {
  const d = device(), caller = new AbortController();
  const session = await d.prepared.open("hid");
  d.prepared.open = async () => { caller.abort(); return session; };
  await expect(ledgerSignIn(fixture(), d.prepared, "hid", DEFAULT_LEDGER_PATH, vi.fn(), vi.fn(), caller.signal)).rejects.toThrow();
  expect(d.close).toHaveBeenCalled(); expect(d.getAddress).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});