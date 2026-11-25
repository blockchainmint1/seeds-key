# New-coin compatibility preparation — 2026-11-25

Owner approved the safe preparation from the v3 SEEDS handoff. This is not approval to export XLM, TON or SUI or to publish without independent review.

## Key implementation

- Manifest, outgoing handoff and success/held-change response boundaries accept only account 1106. A server retry cannot select another pocket or trigger another signing/POST cycle.
- SEEDS reference copied verbatim from snapshot `6d5195c0`; all builders supply the manifest URL. Local exact endpoints, host-dependent preview isolation, challenge binding, time checks and Continue gate remain in force.
- Upstream protocol is copied verbatim to `src/lib/key-signin/vault-protocol.ts`, SHA-256 `1329b5a87994ec56fbacad19d71fefe27dffc4dca5e16e18306091cdf67107bb`. Its empty default trust is intentional upstream scaffolding, not usable local configuration. `src/lib/seeds-key/vault-protocol.ts` wraps it with the independently verified KMS public-key pin.
- Signed requests can contain up to 40 unique, well-formed hardened pocket-1106 paths, including every existing family. Signature verification retains actual signed path order. Optional requested paths do not enable optional response keys.
- All existing 16 families remain exported; EVM covers HYPE/HyperEVM and AVAX C-Chain. ADA and XMR entries remain present. No HyperCore support; SEEDS' Monero availability still depends on its own server and send checks.
- Five cryptographic packages are pinned to exactly 2.2.0. No signing key, identity derivation, wallet message, private envelope, or signed Vault label changes.
- No automatic Key reload after POST: retain success/held-change and the explicit return to SEEDS. The exchange owns account-state refresh and final confirmation.

## Paste into HME Vault

> Please update your active `src/lib/signer/seeds-request.ts` verifier, not an unused copy location. Preserve the independently verified `seeds-vault-kms-2026-11` public-key pin, existing clock policy, recipient checks and signed Vault seed label. Accept up to 40 unique hardened pocket-1106 paths that contain every one of the current 16 families; retain and verify the exact signed array, including ordering. Unknown requested optional paths must not trigger unknown key export. Keep producing every current family at pocket 1106, including EVM, ADA and XMR. Add tests for extra paths, reordered signed arrays, forged signatures, dropped families, duplicates, savings paths and cancellation. The Key reference builder now requires `manifestUrl`; its offline reference constructs the exact manifest and submit URLs from the verified SEEDS domain. Do not copy the upstream empty signer map over your verified local pin. XLM/TON/SUI exports remain off pending SEEDS' written go-ahead and reviewed vectors. Keep the signed Vault fingerprint unchanged.

## Paste into SEEDS

> Key's safe preparation is complete, with all 16 existing families retained, account 1106 enforced and future signed-request paths accepted without enabling new exports. The supplied protocol hash matches; we keep it verbatim under key-signin and inject our verified KMS signer through a local wrapper. Do not remove current families from requests or require every wallet to export new optional families immediately. Keep acceptance-first rollout, verify each enabled private/public pair, and send the written XLM/TON/SUI go-ahead after acceptance is audited. Refresh account state on SEEDS after POST; Key preserves its held-change screen and final-confirmation return rather than reloading a used challenge. Please supply independently reviewed XLM/TON W5/SUI public-key/address vectors for accounts 0 and 1106 and 12/24-word plain-Icarus ADA vectors. Account zero is vector-only, never delegated.

## Limits and release gates

Changes in this chat affect Key only; snapshots cannot modify Vault or SEEDS. A new Vault APK and its active verifier remain the Vault team's responsibility. XLM/TON/SUI derivation, optional response acceptance, independent vectors, full release audit, physical APK tests and production phone round-trip remain outside this preparation. No seed or private key needs to be supplied by Bobby.

## Independent review and coordination update — 2026-11-25

- The supplied independent review approves Key preparation at `b7dfba9`, reports 175 passing tests and a passing built-output guard (13 assets). This closes the preparation-review and KMS pure-Ed25519 questions for that version, not the physical-device or future-export release gates.
- The public SEEDS endpoint's exact 19-path signed example is retained in `src/test/seeds-signed-request-example.json`. Tests verify it with Key's pinned production signer at its fixed January clock, reject challenge tampering and reject it at expiry. It must never be used as a live sign-in.
- Owner-approved clarity change: the Vault answer account and manifest pocket must each equal `SEEDS_POCKET`. No account, identity, key, envelope or export is changed.
- Vault snapshot `f4d7de00` now has the active 40-path verifier and preserves its exact 16-family response, KMS pin, signed seed label and cancellation checks. Its roadmap reports 648 tests and an APK 1.0.4 review handoff; that is source/project evidence, not inspection of an installed 1.0.4 APK here.
- SEEDS snapshot `246101b3` includes XLM/TON/SUI acceptance definitions and chain-reference-library tests. The supplied v3 handoff still explicitly says not to ship new keys until written go-ahead after audited, published acceptance. Source implementation or a signed 19-path request is not that go-ahead.
- HME Wallet snapshot `d2e662bf` remains a separate release owner; this chat cannot change its exports or publish its app.
- SEEDS' roadmap also requests a direct `?kind=vault` entry on Key. That separate navigation request is not implemented in these two approved review tidy-ups and is not required for the existing coin → Continue → Vault route.

### Send to SEEDS now

> Key preparation passed independent review; the real KMS-signed 19-path example now has permanent verification/tampering/expiry tests. Vault's active verifier has been updated too. Please distinguish acceptance shipping from wallet export activation: publish and audit XLM/TON/SUI acceptance while continuing to accept existing 16-family links, then provide written go-ahead naming the live release, auditor approval and reviewed account-0/1106 XLM/TON-W5/SUI and 12/24-word plain-Icarus ADA vectors. Your v3 handoff still tells wallets to wait for this. Account zero remains test-vector-only, never delegated.

### Send to HME Vault and HME Wallet now

> Key is ready for the 16-family compatibility release; the missing signer and preparation-audit blockers are closed. Keep all existing 1106 families and the Vault label unchanged. Coordinate your reviewed release artifacts and a disposable-seed phone test. New XLM/TON/SUI exports remain off until SEEDS supplies its written, audited live-acceptance go-ahead and reviewed vectors; after that each wallet team can implement and review its matching exports. Do not wait for Key to export new keys before SEEDS ships acceptance.
