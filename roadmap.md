# Seeds Key — status

## Done
- Cold Storage Coin sign-in (QR scan, pocket 1106 derivation, encrypted handoff to SEEDS)
- Own-wallet sign-in (EIP-1193 browser wallets and Phantom, byte-exact messages, repeatable signatures)
- Direct Ledger sign-in over USB and Bluetooth (Ethereum app, official SDKs loaded only after Continue)
- HME Vault link (Key side): request QR, animated answer scan, full answer re-check before one POST
- Always-pocket-1106 sync with SEEDS (shared rules re-copied verbatim)
- Request safeguards: host binding, time checks, match code, Continue gate, held-change handling
- Hardened delivery: strict-dynamic script policy, no-referrer meta, built-output guard script

## Next
- HME Vault "Link to Seeds" screen — built in the HME Vault project from docs/hme-vault-link.md, then a real-phone QR test
- Physical Ledger verification across models, firmware and browsers
- Complete live SEEDS sign-in and physical coin scan with a coordinated test request
- Independent security review of the full flow before wider promotion
