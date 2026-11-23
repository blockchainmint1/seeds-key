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

## Next

- Diagnose Bobby's live Vault pairing refusal — awaiting his installed Vault version and exact underlying Seeds rejection; fresh Key/Vault synthetic probes both passed live text/key-format validation and stopped intentionally at signature verification.
- Private vulnerability-report destination — awaiting an owner-approved inbox or confirmed private repository reporting
- Vault v2 activation — SEEDS signed manifests and independently verified signing public key pinned in Key/Vault
- HME Vault "Link to Seeds" screen — built in the HME Vault project from docs/hme-vault-link.md, then a real-phone QR test
- Physical Ledger verification across models, firmware and browsers
- Complete live SEEDS sign-in and physical coin scan with a coordinated test request
- Independent security review of the full flow before wider promotion
