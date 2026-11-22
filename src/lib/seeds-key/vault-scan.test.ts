import { describe, expect, it } from "vitest";
import { VaultAnswerCollector } from "./vault-scan";
import { toParts } from "./qr-parts";
import { MAX_RESPONSE_CHARS, SCAN_TIMEOUT_MS } from "./vault-protocol";

describe("bounded Vault answers", () => {
  it("has a 64 KB answer cap and a two-minute scan cap", () => {
    expect(MAX_RESPONSE_CHARS).toBe(65536); expect(SCAN_TIMEOUT_MS).toBe(120000);
  });
  it("reassembles modern parts in any order with duplicate frames", () => {
    const text = "x".repeat(2000), c = new VaultAnswerCollector(), parts = toParts(text);
    c.add(parts[0] ?? ""); c.add(parts[0] ?? "");
    let result: string | null = null;
    for (const p of [...parts].reverse()) result = c.add(p) ?? result;
    expect(result).toBe(text);
  });
  it("rejects legacy frames", () => {
    expect(() => new VaultAnswerCollector().add("HMQR:1/2:abc")).toThrow(/Update/);
  });
  it("rejects mixed sessions", () => {
    const c = new VaultAnswerCollector();
    c.add(toParts("x".repeat(2000))[0] ?? "");
    expect(() => c.add(toParts("y".repeat(2000))[1] ?? "")).toThrow(/Different/);
  });
  it("checks index bounds", () => {
    expect(() => new VaultAnswerCollector().add("HMQR2:aaaaaaaa:0/2:abc")).toThrow();
  });
  it("rejects corrupted whole-message checksum", () => {
    const c = new VaultAnswerCollector();
    expect(() => c.add("HMQR2:aaaaaaaa:1/1:abc")).toThrow(/damaged/);
  });
  it("rejects conflicting duplicate parts", () => {
    const c = new VaultAnswerCollector(); c.add("HMQR2:aaaaaaaa:1/2:abc");
    expect(() => c.add("HMQR2:aaaaaaaa:1/2:xyz")).toThrow(/Conflicting/);
  });
  it("bounds total frame count before buffering", () => {
    expect(() => new VaultAnswerCollector().add("HMQR2:aaaaaaaa:1/275:abc")).toThrow();
  });
  it("bounds cumulative characters before reassembly", () => {
    const c = new VaultAnswerCollector();
    for (let n = 1; n <= 32; n++) c.add(`HMQR2:aaaaaaaa:${n}/34:${"x".repeat(2000)}`);
    expect(() => c.add(`HMQR2:aaaaaaaa:33/34:${"x".repeat(2000)}`)).toThrow(/too large/);
  });
  it("rejects oversized single answers", () => {
    expect(() => new VaultAnswerCollector().add("x".repeat(65537))).toThrow(/too large/);
  });
  it("clear drops transfer state and permits a new session", () => {
    const c = new VaultAnswerCollector(); c.add(toParts("x".repeat(2000))[0] ?? ""); c.clear();
    expect(c.progress.have).toBe(0); expect(c.progress.total).toBe(0);
    expect(() => c.add(toParts("y".repeat(2000))[0] ?? "")).not.toThrow();
  });
});