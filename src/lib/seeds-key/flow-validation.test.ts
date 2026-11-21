import { afterEach, expect, it, vi } from "vitest";
import { base64urlnopad } from "@scure/base";
import { coinSignIn, walletSignIn } from "./flows";
import type { FullManifest } from "./manifest";

const fixture = (): FullManifest => ({
  type: "seeds-key-signin", version: 1, domain: "seeds.honest.money",
  origin: "https://seeds.honest.money", app_name: "Seeds Exchange",
  challenge_id: "a".repeat(32), challenge: "c".repeat(48),
  recipient_pubkey: base64urlnopad.encode(new Uint8Array(32).fill(1)),
  submit_url: "https://seeds.honest.money/api/public/key-signin/submit",
  expires_at: new Date(Date.now() + 60_000).toISOString(), pocket: 1106,
});
afterEach(() => vi.unstubAllGlobals());

it("rejects expired coin requests before attempting phrase validation or derivation", async () => {
  const m = fixture(); m.expires_at = new Date(0).toISOString();
  await expect(coinSignIn(m, "deliberately not a recovery phrase")).rejects.toThrow(/expired/);
});

it("rejects expired wallet requests before opening a provider", async () => {
  const request = vi.fn(), step = vi.fn();
  vi.stubGlobal("window", { location: { origin: "http://localhost:8080" }, ethereum: { request } });
  const m = fixture(); m.expires_at = new Date(0).toISOString();
  await expect(walletSignIn(m, "evm", step)).rejects.toThrow(/expired/);
  expect(request).not.toHaveBeenCalled(); expect(step).not.toHaveBeenCalled();
});

it("does not ask a provider to sign a wallet kind absent from the manifest", async () => {
  const request = vi.fn();
  vi.stubGlobal("window", { location: { origin: "http://localhost:8080" }, ethereum: { request } });
  await expect(walletSignIn({ ...fixture(), kinds: ["coin"] }, "evm", vi.fn())).rejects.toThrow(/doesn't allow/);
  expect(request).not.toHaveBeenCalled();
});