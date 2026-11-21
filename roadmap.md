# SEEDS compatibility update

- [x] Re-copy SEEDS reference files and verify guide v3 vectors.
- [x] Validate Key host, request times and match code; require Continue before key work.
- [x] Display signer identity and support exact-message Phantom sign-in.
- [x] Handle held key changes without showing sign-in success.
- [x] Run all tests and prepare an inspected auditor source packet.
- [ ] Publish — blocked: independent re-audit and real-wallet host-warning checks required.
- [ ] Verify complete live SEEDS sign-in and physical coin scan — blocked: real wallet/coin and coordinated live or same-host SEEDS test request required; mock flows are not release verification.
- [ ] Guide K4 static-only delivery, SRI and public built-file hashes — blocked: separate architecture/release work conflicts with the required TanStack Start stack; not implemented in this compatibility update.

## Previous approved security repairs

- [x] Validate manifest identity, known endpoints, field types, expiry and pocket bounds; separate production and preview trust.
- [x] Add request-specific script nonces and basic security headers without disrupting the editor preview or wallet popups.
- [x] Preserve the coin/wallet return choice and prevent stale requests from continuing.
- [x] Apply targeted dependency repairs and run regression/adversarial checks.
- [x] Deliver a fresh source packet and verification report for the independent auditor.
- [x] Re-audit tidy-ups: localhost trust limited to development builds; unused UI packages removed (dependency warnings 25 -> 3, all build tooling).
- SEEDS now supplies the H1/H2/M4 protocol changes; their effectiveness remains subject to independent re-audit, not declared closed here.
