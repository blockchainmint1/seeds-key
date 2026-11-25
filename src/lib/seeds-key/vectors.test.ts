import { describe, expect, it } from "vitest";
import { hex } from "@scure/base";
import {
  coinIdentityKey,
  signTxcMessage,
  walletPocketWords,
} from "@/lib/key-signin/seeds-key-reference";
import { walletPocketMessage, pairingCode, checksumEvmAddress } from "@/lib/key-signin/rules";
import { pocketsFromMnemonic } from "@/lib/pockets/derive";
import { allowedManifestUrl, checkManifest, readSubmit } from "./manifest";

const PHRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("Seeds Key test vectors", () => {
  it("coin identity address", () => {
    expect(signTxcMessage(coinIdentityKey(PHRASE), "x").address).toBe(
      "TZZCuca5ntPVCJL5ryTjh465Jvw5vHxsVd",
    );
  });
  it("pocket 1106 addresses", () => {
    const a = pocketsFromMnemonic(PHRASE, { account: 1106 }).addresses as Record<string, string>;
    const all = JSON.stringify(a);
    for (const v of [
      "Tg7WMV1iBgw6w44Z8ZzftiSKPu1yEStXvy",
      "KC4qNWsaf9soCJSmzNXjjWDcYwbedST1ht",
      "bc1q49kxnqa4uuh2ej0k6ys2vrd26nq338pwaf3r30",
      "LdydRYQJ1fQ4vwpqYn1tUzfLzdfQxZS6cP",
      "0x7231a79714ffD1b9f51216f79762fA38A40b4544",
      "DXTivYcF78Vznitg6f8JGXouZwsm3xioik1LGWj2H1jV",
    ])
      expect(all).toContain(v);
  });
  it("outside wallet pocket words", () => {
    const sig = hex.decode(
      "fb124074c5b142a7fd343341e1b7b0daab2d21761635b82c52e43dbaf9d6d88709a5754319c0595ec99cf2d791c3ee3e02786934a05147f1c79866f3cde4a4511c",
    );
    expect(walletPocketWords(sig, "key.example")).toBe(
      "educate unveil nation talent turtle mother satisfy diesel nerve huge riot disorder video belt romance caught morning escape canoe top crystal various real same",
    );
  });
});

describe("only talks to Seeds", () => {
  it("accepts seeds.honest.money and rejects look-alikes", () => {
    expect(
      allowedManifestUrl(
        "https://seeds.honest.money/api/public/key-signin/manifest/" + "a".repeat(32),
      ),
    ).not.toBeNull();
    expect(allowedManifestUrl("https://seeds.honest.money.evil.com/x")).toBeNull();
    expect(allowedManifestUrl("http://seeds.honest.money/x")).toBeNull();
  });
  it("rejects a submit_url on another origin", () => {
    const url = new URL("https://seeds.honest.money/m/1");
    const m = {
      type: "seeds-key-signin",
      version: 1,
      challenge_id: "a",
      challenge: "b",
      recipient_pubkey: "c",
      domain: "seeds.honest.money",
      pocket: 1106,
      submit_url: "https://evil.com/submit",
    };
    expect(() => checkManifest(url, m)).toThrow();
  });
  it("409 cannot authorize a different pocket", () => {
    expect(readSubmit(409, { error: "use_pocket", account: 1107 })).not.toHaveProperty("usePocket");
  });
});

it("guide match code and EIP-55 identity", () => {
  expect(pairingCode("c".repeat(48))).toBe("673");
  expect(checksumEvmAddress("0x2c7536e3605d9c16a7a3d7b1898e529396a65c23")).toBe(
    "0x2c7536E3605D9C16a7a3D7b1898e529396a65c23",
  );
  expect(
    walletPocketMessage(
      "key.seeds.honest.money",
      "evm",
      "0x2c7536e3605d9c16a7a3d7b1898e529396a65c23",
    ),
  ).toContain("Nonce: SeedsPocket2\nIssued At: 2026-11-21T00:00:00.000Z");
});
