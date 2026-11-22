/**
 * Pins the owner decision of Nov 22, 2026: every trading-pocket link uses
 * pocket 1106 (SEEDS_POCKET) only, including after a revoke. The rules file
 * itself is a verbatim SEEDS copy — this test is ours, so a stale copy that
 * still hands out 1107+ fails here instead of reaching members.
 */
import { describe, expect, it } from "vitest";
import { pocketFor } from "./rules";
import { FIRST_POCKET, SEEDS_POCKET } from "../pockets/coins";

describe("pocketFor (always 1106)", () => {
  it("is 1106 for a first-time sign-in", () => {
    expect(pocketFor([])).toBe(1106);
  });

  it("is 1106 while a link is active", () => {
    expect(pocketFor([{ account: 1106, active: true }])).toBe(1106);
  });

  it("is still 1106 after a revoke (no fresh pocket number)", () => {
    expect(pocketFor([{ account: 1106, active: false }])).toBe(1106);
  });

  it("is 1106 even when older history used higher pocket numbers", () => {
    expect(
      pocketFor([
        { account: 1106, active: false },
        { account: 1107, active: false },
      ]),
    ).toBe(1106);
  });

  it("SEEDS_POCKET is the first pocket, 1106", () => {
    expect(SEEDS_POCKET).toBe(FIRST_POCKET);
    expect(SEEDS_POCKET).toBe(1106);
  });
});
