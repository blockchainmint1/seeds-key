# Security — Seeds Key

## Private disclosure status

A dedicated private reporting address has not yet been confirmed by the maintainer. Do not post exploit details, recovery phrases, private keys, signatures, sealed handoffs or account/session tokens in public issues. This policy does not advertise the general Honest Money website or help desk as a verified private vulnerability channel.

The maintainer must confirm a private destination and its access controls before this disclosure setup is considered complete. If the repository provider offers private vulnerability reporting, use it only when the repository visibly has it enabled; its status has not been verified here.

## Scope

Seeds Key at `https://key.seeds.honest.money`, its request/answer checks, coin/wallet/Ledger flows, offline Vault QR protocol and delivered client assets are in scope for independent review. Seeds Exchange, HME Vault and third-party wallet software have separate implementations; issues spanning those products require coordinated review. Do not test against other members or use real funds without explicit authorization.

Only public requests, identity proofs and sealed pocket-1106 handoffs are intended to leave the device. Recovery phrases are never intended to be sent, stored, logged or shown. Seeds receives trading keys after a successful link; revocation does not rotate those deterministic keys. Move funds to independent keys if compromise is suspected.

## Known limitations and release gates

- A genuine request can be forwarded. Its signature authenticates the request fields, not ownership of the receiving Seeds browser session. Coordinated session-delivery and forwarded-link protections remain separate work.
- Earlier audit items labelled H1 (Solana/direct-Ledger sign-in), H2 (session delivery) and M4 (byte canonicalisation) are not declared resolved by the Vault v2 re-audit. No exploit details from removed private notes are reproduced here.
- Vault production request trust is deliberately empty until an independently verified Seeds signing public key is pinned in both Key and offline Vault. No unsigned or test-key fallback is permitted.
- Real-phone Vault QR exchange, physical coin scanning, physical Ledger model/firmware/browser checks and complete live Seeds sign-in remain coordinated verification gates.
- Designated editor previews and development localhost accept only preview Seeds, never production Seeds. They have less restrictive page protections and must not be used with real recovery phrases.
- Browser memory cleanup is best effort; JavaScript strings cannot be guaranteed to be zeroed.
- Hosting can modify response headers and inject scripts after the application runs. Check actual live headers and assets after each authorized deployment.

Third-party security review is required before publishing changes. A passing test suite or a clean secret scan is not a complete security certification. See [verification](docs/verification.md) and [Vault coordination](docs/hme-vault-link.md).