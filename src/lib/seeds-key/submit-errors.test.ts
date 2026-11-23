import { describe, expect, it } from "vitest";
import { classifySubmitFailure } from "./submit-errors";

describe("Seeds submit rejection classification", () => {
  it("only an explicit message mismatch is classified as signed-text failure", () => {
    expect(classifySubmitFailure("message mismatch")).toEqual({ code: "message_mismatch" });
    expect(classifySubmitFailure("bad paths").code).toBe("invalid_request");
  });
  it("recognizes a rejected public key and preserves its supported chain", () => {
    expect(classifySubmitFailure("bad xpub ADA")).toEqual({
      code: "invalid_public_key",
      chain: "ADA",
    });
  });
  it("distinguishes private/public key mismatches from signed-text mismatches", () => {
    expect(classifySubmitFailure("key mismatch XMR")).toEqual({
      code: "private_key_mismatch",
      chain: "XMR",
    });
  });
  it("recognizes encryption rejection separately", () => {
    expect(classifySubmitFailure("cannot open payload")).toEqual({ code: "payload_unreadable" });
  });
  it("does not accept arbitrary server text or unknown chain names", () => {
    for (const value of [
      "bad xpub SECRET",
      "key mismatch SECRET",
      "expected: sensitive data",
      null,
      {},
    ]) {
      expect(classifySubmitFailure(value)).toEqual({ code: "invalid_request" });
    }
  });
});
