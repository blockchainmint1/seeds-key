import { expect, it } from "vitest";
import { vaultLabelMessage, readVaultLabel } from "./vault-label";

it("binds exactly eight lowercase hex characters to the complete handoff", () => {
  expect(vaultLabelMessage("signed handoff", "73c5da0a")).toBe(
    '["HME Vault seed label",1,"signed handoff","73c5da0a"]',
  );
  expect(vaultLabelMessage("signed handoff", "00000001")).toBe(
    '["HME Vault seed label",1,"signed handoff","00000001"]',
  );
  for (const invalid of ["73c5da0", "73c5da0aa", "73C5DA0A", "zzzzzzzz"])
    expect(() => vaultLabelMessage("signed handoff", invalid)).toThrow();
});

it("keeps legacy answers compatible without adding guessed metadata", () => {
  expect(readVaultLabel({}, "handoff", "identity", () => false)).toBeUndefined();
});

it("requires both metadata fields and a valid signature", () => {
  expect(() => readVaultLabel({ vault_label_signature: "s" }, "m", "id", () => true)).toThrow();
  expect(() => readVaultLabel({ vault_fingerprint: "73c5da0a" }, "m", "id", () => true)).toThrow();
  expect(() =>
    readVaultLabel(
      { vault_fingerprint: "73c5da0a", vault_label_signature: "s" },
      "m",
      "id",
      () => false,
    ),
  ).toThrow();
});
