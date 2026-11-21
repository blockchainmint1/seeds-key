# SEEDS compatibility update

## Ledger and approved audit follow-ups
- [x] Add direct Ledger USB/Bluetooth Ethereum signing with device cleanup and unchanged SEEDS pocket derivation.
- [x] Apply approved 60-second issued-at tolerance with strict expiry and separate local time errors; add exact SIWS field coverage.
- [x] Run 70 regression tests and desktop/mobile browser checks; prepare a fresh auditor source packet.
- [ ] Physical Ledger and complete live SEEDS sign-in verification — blocked: hardware and coordinated live request required; publication remains held.

- [x] Re-copy SEEDS reference files and verify guide v3 vectors.
- [x] Validate Key host, request times and match code; require Continue before key work.
- [x] Display signer identity and support exact-message Phantom sign-in.
- [x] Handle held key changes without showing sign-in success.
- [x] Run all tests and prepare an inspected auditor source packet.
- [x] Review independent v3 re-audit; 56 tests still pass. No application repairs applied by this review.
- [ ] Publish — blocked: re-audit confirms H2 open, Solana H1 open and EVM M4 unresolved; protocol decisions and real-wallet host-warning checks required.
- [ ] Verify complete live SEEDS sign-in and physical coin scan — blocked: real wallet/coin and coordinated live or same-host SEEDS test request required; mock flows are not release verification.
- [ ] Guide K4 delivery/verifiability — blocked: static-only delivery conflicts with the required TanStack Start stack; SRI and public built-file hashes remain unimplemented. Commit/asset-hash publication is compatible with the stack but needs separately approved release work.

## Previous approved security repairs

- [x] Validate manifest identity, known endpoints, field types, expiry and pocket bounds; separate production and preview trust.
- [x] Add request-specific script nonces and basic security headers without disrupting the editor preview or wallet popups.
- [x] Preserve the coin/wallet return choice and prevent stale requests from continuing.
- [x] Apply targeted dependency repairs and run regression/adversarial checks.
- [x] Deliver a fresh source packet and verification report for the independent auditor.
- [x] Re-audit tidy-ups: localhost trust limited to development builds; unused UI packages removed (dependency warnings 25 -> 3, all build tooling).
- Independent v3 re-audit received: H1 reduced for browser EVM providers pending wallet checks, still open for Solana and direct Ledger; H2 and M4 remain open. Approved clock-tolerance/error wording and SIWS parser coverage implemented; session delivery and wallet derivation require SEEDS coordination. Ledger transports are deprecated, and the added runtime elliptic dependency brings a low advisory; independent review remains required.
