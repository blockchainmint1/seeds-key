import { describe, expect, it } from "vitest";
import {
  readSignedVaultRequest,
  parseSignedVaultRequest,
  SEEDS_REQUEST_KEYS,
} from "./vault-protocol";
import { buildVaultResponse } from "./vault-link-reference";
import { signedRequest, TEST_TRUST } from "@/test/vault-fixture";

describe("signed Vault request policy", () => {
  it("production pins only the verified SEEDS key and rejects the test signer", () => {
    expect(SEEDS_REQUEST_KEYS).toEqual({
      "seeds-vault-2026-11": "KuDdTWX-bDwxkSff2lULKVwvUS_Dfa0tZLy_iWefuxc",
    });
    expect(() => readSignedVaultRequest(signedRequest())).toThrow(/verified signing key/);
  });
  it("accepts the pinned signer for pocket 1106 and 16 chains", () => {
    const r = readSignedVaultRequest(signedRequest(), TEST_TRUST);
    expect(r.pocket).toBe(1106);
    expect(r.paths).toHaveLength(16);
  });
  it("refuses unsigned requests", () => {
    const { request_sig, ...r } = signedRequest();
    expect(() => readSignedVaultRequest(r, TEST_TRUST)).toThrow();
  });
  it.each([
    "challenge_id",
    "challenge",
    "recipient_pubkey",
    "issued_at",
    "expires_at",
    "domain",
    "key_host",
    "pocket",
    "paths",
    "signing_key_id",
    "v",
    "request_sig",
  ])("rejects tampering with %s", (field) => {
    const r = signedRequest();
    const mutations: Record<string, unknown> = {
      challenge_id: "b".repeat(32),
      challenge: "d".repeat(48),
      recipient_pubkey: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
      issued_at: new Date(Date.now() - 1000).toISOString(),
      expires_at: new Date(Date.now() + 1000).toISOString(),
      domain: "evil.example",
      key_host: "evil.example",
      pocket: 1107,
      paths: ["m/44'/2'/0'"],
      signing_key_id: "other",
      v: 1,
      request_sig: "A".repeat(86),
    };
    expect(() => readSignedVaultRequest({ ...r, [field]: mutations[field] }, TEST_TRUST)).toThrow();
  });
  it("rejects pocket 1107 even when signed by the trusted key", () => {
    expect(() => readSignedVaultRequest(signedRequest({ pocket: 1107 }), TEST_TRUST)).toThrow();
  });
  it("rejects savings account paths even when signed", () => {
    expect(() =>
      readSignedVaultRequest(signedRequest({ paths: ["m/44'/696969'/0'"] }), TEST_TRUST),
    ).toThrow();
  });
  it("expiry remains strict at the exact boundary", () => {
    const r = signedRequest();
    expect(() => readSignedVaultRequest(r, TEST_TRUST, Date.parse(r.expires_at))).toThrow(
      /expired/,
    );
  });
  it("allows exactly 60 seconds of issued-at skew, not more", () => {
    const now = Date.now();
    const r = signedRequest({
      issued_at: new Date(now + 60_000).toISOString(),
      expires_at: new Date(now + 120_000).toISOString(),
    });
    expect(readSignedVaultRequest(r, TEST_TRUST, now).pocket).toBe(1106);
    expect(() => readSignedVaultRequest(r, TEST_TRUST, now - 1)).toThrow(/clock/);
  });
  it("limits requests to ten minutes", () => {
    const r = signedRequest();
    expect(() =>
      readSignedVaultRequest(
        signedRequest({
          issued_at: r.issued_at,
          expires_at: new Date(Date.parse(r.issued_at) + 600_001).toISOString(),
        }),
        TEST_TRUST,
      ),
    ).toThrow();
  });
  it.each(["issued_at", "expires_at"])("requires exact UTC milliseconds for signed %s", (field) => {
    const original = signedRequest();
    const value = field === "issued_at" ? original.issued_at : original.expires_at;
    const withoutMilliseconds = value.replace(/\.\d{3}Z$/, "Z");
    expect(() =>
      readSignedVaultRequest(signedRequest({ [field]: withoutMilliseconds }), TEST_TRUST),
    ).toThrow();
    expect(() =>
      readSignedVaultRequest(signedRequest({ [field]: value.replace("Z", "+00:00") }), TEST_TRUST),
    ).toThrow();
    expect(readSignedVaultRequest(original, TEST_TRUST).pocket).toBe(1106);
  });
  it("caps incoming request QR at 8192 characters", () => {
    expect(() => parseSignedVaultRequest(" ".repeat(8193), TEST_TRUST)).toThrow();
  });
  it("revalidates before touching recovery words", async () => {
    await expect(
      buildVaultResponse({ ...signedRequest(), pocket: 1107 }, "not a phrase", TEST_TRUST),
    ).rejects.toThrow(/verified/);
  });
});
