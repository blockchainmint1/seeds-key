# Seeds Key — review of the third independent audit

Date: 2026-11-21 UTC. Decision: **HOLD. No application, wallet, dependency, hosting or SEEDS changes approved or applied by this review.**

## Evidence reviewed

- Uploaded `SEEDS-Key-v3-Re-Audit.md` and accompanying third-round summary.
- Current Key `flows.ts`, `manifest.ts`, shared `rules.ts`, wallet tests, prior v3 verification handoff and roadmap.
- Fresh `bunx vitest run`: **56/56 tests across 8 files passed** on this checkout. Mock/provider tests are not real-wallet or live SEEDS session verification.
- Packet hashes, clean install, production build and 24 dependency advisories are the independent auditor's reported results; not independently rerun in this review. The earlier handoff also reports 24 advisories, not three. These are not claimed fixed.

## Findings and impact

### H2 — forwarded-link account access: agree, still open

The person controlling the originating SEEDS tab knows the match code and can answer its confirmation. A victim using a genuine Key link therefore does not prove that the victim owns that tab. Held-key confirmation protects replacement, not returning-user sign-in when the active keys match.

The current Key return URL has no session-completion capability. The session-delivery repair must be designed and verified in SEEDS, not claimed solved by copy or match-code checks here. A completion-browser-only handoff is a promising direction, not a complete design: it needs one-time, bound redemption, no polling delivery to the initiating tab, and an explicit desktop/phone transfer design. This review did not inspect the current SEEDS server or reproduce a live takeover; the SEEDS-side attack conclusion follows the supplied audit and documented protocol.

### H1 — wallet-signature phishing: agree with the risk; qualify the proposed remedy

EVM origin-warning benefits remain conditional on actual wallet behaviour. A warning is not a hard block. MetaMask, Rabby, Coinbase and hardware-wallet-through-provider checks remain required.

Solana's native `signIn` path validates exact message bytes locally, but `signMessage` fallback still produces a deterministic pocket-secret signature over the same public text. A phishing page can request that signature independently of our page.

**Removing Key's fallback or requiring native `signIn` on Key alone does not eliminate this attack if Phantom still signs the same text through `signMessage` on another origin.** The attacker does not use Key's controls. Accept a closure only after wallet-side mismatched-origin refusal is demonstrated for this exact text, or a jointly reviewed protocol design removes the reusable-signature exposure. Disabling Solana wallet sign-in would remove the launch path but would block legitimate Solana users; do not silently change that support. Coin sign-in is a separate path, but remains exposed to H2.

### M4 — EVM recovery byte: agree, coordinated decision required

The Key path checks two signatures for repeatability and validates 65-byte length, but derives from the complete unnormalised signature. A provider returning recovery byte 0/1 versus 27/28 can generate a different pocket for the same key. Same-provider repeatability does not detect cross-provider disagreement.

Normalising before derivation changes some existing derived pockets. Do not modify copied reference modules locally; SEEDS must define the canonical form and compatible vectors first, then Key re-copies them. SEEDS' assertion of no member usage is not independently verified here; do not treat a v2 label or an audit assumption as proof that changing derivation is harmless.

### Device-clock tolerance: reasonable, with a factual correction

The current future-issued rejection already says **“This sign-in request has invalid request times.”** It does not display the “someone else may have used your code” message for that branch. The latter is used for local expiry as well as certain server used/expired responses. Thus the audit's description of the future-issued wording is not exact.

Proposed bounded repair, pending Bobby's approval: permit issued-at up to **60 seconds** ahead of the client clock; keep expiry strict and the ten-minute manifest lifetime unchanged; use distinct local clock/expiry wording and retain used/expired warnings for the relevant server responses. This is a proposed value, not an existing operational rule. Add concrete boundary tests and keep validation before signing and POST.

### SIWS parser regression test: safe additive preparation

Pin the exact parsed native-signIn fields for the full handoff message, including resource URLs, expiry and nonce. This would add coverage without altering wallet messages, signatures or derivation. Pending approval, no test or implementation changes made.

### K4 — verifiability: refine the earlier roadmap wording

Publishing source revision and built-asset hashes is compatible with TanStack Start and can be a separately reviewed release improvement. It does **not** establish static-only delivery, SRI or full K4 compliance. Request-specific SSR nonces remain intact. Source/build provenance and the exact deployed artifacts must agree before public hashes have meaning.

### Ledger

Direct USB/Bluetooth support remains unimplemented. Ledger through MetaMask must be tested with the provider's origin warning; direct Ledger signing must not be presented as inheriting that check automatically. No Ledger changes are authorised by this audit review.

## Proposed next steps

1. Approve only the bounded device-clock/error-message repair and native-SIWS field coverage, if desired.
2. Send SEEDS this review: H2 remains open; agree the session recipient and cross-device design before implementation.
3. Decide Solana launch support from real mismatched-origin wallet testing, not the assumption that deleting a local fallback fixes phishing.
4. Verify member-usage history and decide EVM recovery-byte canonicalisation jointly before altering wallet-pocket derivation.
5. Keep publication held for protocol resolution, physical coin scan, real-wallet warning checks, complete live SEEDS confirmation and deployed-host protection verification. The independent v3 implementation re-audit is received; it is not release clearance.

This document is a review and approval boundary, not a new security audit or a claim of vulnerability closure.