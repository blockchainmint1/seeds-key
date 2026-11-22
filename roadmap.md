# SEEDS compatibility update

## Ledger and approved audit follow-ups
- [x] Sync always-pocket-1106 decision (Bobby, Nov 22 2026): re-copied SEEDS rules.ts and coins.ts verbatim (snapshot 0b048b02) — pocketFor() always returns SEEDS_POCKET (1106), including after a revoke; coin accounts now named by 6-digit CoinID. Added our own rules.test.ts pinning 1106 (5 tests). 84/84 tests pass, built-output guard OK, build OK. Manifest validation still accepts the 1106–2105 range intentionally — SEEDS enforces 1106 server-side and answers use_pocket: 1106. Auditor supplement delivered.
- [x] Replace reported Ledger 0x650e raw error with Ethereum-app recovery guidance; desktop USB/mobile Bluetooth before-and-after simulations verified, 78 tests pass; signing and publication unchanged.
- [x] Review fourth-round Ledger audit against current code and loading-repair supplement; 72 tests pass, no application changes applied. Audit covers 7014e33, not the later 0d1d102 loading repair.
- [x] Implement approved limited Ledger follow-ups: same-path recovery notice, adjacent signer display, older-browser cancellation/cleanup repair and globals documentation; 78 tests pass and desktop/mobile simulated flows verified; auditor supplement prepared. Transport migration and publication remain held.
- [x] Repair reproduced live-site Ledger packaging configuration; 72 tests pass including final production alias resolution. Live correction remains blocked on independent review and an approved release; compiled deployment and physical hardware not verified.
- [x] Add direct Ledger USB/Bluetooth Ethereum signing with device cleanup and unchanged SEEDS pocket derivation.
- [x] Apply approved 60-second issued-at tolerance with strict expiry and separate local time errors; add exact SIWS field coverage.
- [x] Run 70 regression tests and desktop/mobile browser checks; prepare a fresh auditor source packet.
- [x] Review fifth-round Ledger supplement re-audit; repairs confirmed at compiled-asset level, no application changes applied yet. Two live-host findings verified independently: project is published and public (last publish 2026-11-21 21:15 UTC), and platform visitor analytics/click tracking are enabled (the injected /__l5e script).
- [x] Adopt audit-recommended protections — approved by Bobby 2026-11-21: strict-dynamic script policy, no-referrer meta tag, built-output guard script with AGENTS.md release-gate note. 79/79 tests pass, guard OK, preview verified; auditor supplement delivered. Live-host verification (injected script blocked, app and Ledger chunks load) is a standing step after the next publish.
- [x] Publish-state decision — Bobby chose 2026-11-21 to keep the site live and public while the remaining audit items stay open; open H1/H2 risks are therefore live, not pending.
- [x] Visitor analytics and click tracking switched off by Bobby 2026-11-21; verified off in project settings. Live host re-verified after the 21:24 UTC publish: strict-dynamic CSP live, no-referrer meta present, no /__l5e events script in HTML, page loads with zero console errors or failed requests. SEEDS-side link confirmation remains Bobby's action.
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
