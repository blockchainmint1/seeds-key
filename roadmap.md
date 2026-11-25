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

## Next

- Vault active-verifier compatibility update and reviewed APK — blocked on the Vault project implementing the attached handoff; this project cannot write to its source.
- New-coin preparation release — independent audit, shipped-asset guard and authorized production phone test required before publication.
- XLM/TON/SUI export activation — blocked on SEEDS' written acceptance go-ahead and independently reviewed vectors; do not add these keys yet.
- Vault seed-fingerprint naming — blocked on Vault producing the signed label and SEEDS verifying/storing/displaying it; independent review and updated APK phone test before publication.
- Private vulnerability-report destination — awaiting an owner-approved inbox or confirmed private repository reporting
- Vault v2 activation — SEEDS signed manifests and independently verified signing public key pinned in Key/Vault
- HME Vault "Link to Seeds" screen — built in the HME Vault project from docs/hme-vault-link.md, then a real-phone QR test
- Physical Ledger verification across models, firmware and browsers
- Complete live SEEDS sign-in and physical coin scan with a coordinated test request
- Independent security review of the full flow before wider promotion
