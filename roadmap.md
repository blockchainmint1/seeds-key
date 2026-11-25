# Seeds Key — status

## Done

- Cold Storage Coin sign-in (QR scan, pocket 1106 derivation, encrypted handoff to SEEDS)
- Own-wallet sign-in (EIP-1193 browser wallets and Phantom, byte-exact messages, repeatable signatures)
- Direct Ledger sign-in over USB and Bluetooth (Ethereum app, official SDKs loaded only after Continue)
- HME Vault link (Key side): request QR, animated answer scan, full answer re-check before one POST
- Always-pocket-1106 sync with SEEDS (shared rules re-copied verbatim)
- Request safeguards: host binding, time checks, match code, Continue gate, held-change handling
- Hardened delivery: strict-dynamic script policy, no-referrer meta, built-output guard script
- Key-side Vault v2 request verification, bounded modern QR scans, timeout and abortable handoff; coordination instructions
- Approved re-audit repairs: preview-only trust, unavailable Vault choice hidden, larger request QR, font notices and security/provenance/verifier docs; 145 tests and built-output guard pass
- Specific, allowlisted Seeds handoff refusal messages; signed text, signatures and keys remain unchanged.
- Bobby reports successful Vault-to-SEEDS pairing on his phone.
- Key-side optional signed Vault seed-fingerprint label and unchanged forwarding; 159 tests pass. Cross-project instructions and auditor handoff prepared.
- Approved new-coin preparation complete on Key: preserved signer through a local wrapper around the verbatim SEEDS protocol, bounded future request paths, 1106-only boundaries and single POST, updated reference callers, exact crypto versions, HYPE/AVAX coverage, unchanged 16-family exports and Vault label. All 175 tests pass; desktop/phone synthetic wallet flows preserve held confirmation.
- Independent auditor approved preparation `b7dfba9` and ran the built-output guard successfully; verified the pinned KMS key and real signed example. Owner-approved fixed-clock fixture/tamper/expiry tests and clear Vault pocket check complete; 179 tests pass.
- Cross-project source check (2026-11-25): Vault `f4d7de00` has its active 40-path verifier and signed label; SEEDS `246101b3` verifies/stores/displays that label. Prior missing-pin, missing-label and missing-active-verifier code blockers are closed. HME Wallet checked at `d2e662bf`.

## Next

- Current Vault compatibility APK — await its independent approval and release artifact/build-run evidence; active-verifier source work is complete, but its installed APK is not verified here.
- Compatibility release coordination — await authorized production phone test of current reviewed builds, SEEDS final confirmation/readback and release authorization; check live headers/assets after publish. The preparation audit and built-output guard at `b7dfba9` are complete; the small follow-up commit accompanies the new review packet.
- XLM/TON/SUI export activation — blocked on SEEDS' written acceptance go-ahead and independently reviewed vectors; do not add these keys yet.
- Direct Vault entry for SEEDS' `?kind=vault` link — separate navigation request in SEEDS' roadmap, not implemented in this review-tidy-up scope; existing coin → Continue → Vault flow remains available.
- Private vulnerability-report destination — awaiting an owner-approved inbox or confirmed private repository reporting
- Physical Ledger verification across models, firmware and browsers
- Complete physical coin scan with a coordinated test request
- Independent security review of the full flow before wider promotion
