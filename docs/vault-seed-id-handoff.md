# Vault seed ID naming — coordinated implementation and review

Requested by Bobby: use the ID shown beside the seed name and word count in HME Vault, instead of Coin plus address characters 2–7. Key displays `Vault <fingerprint>` when authenticated metadata is present. SEEDS should use the same default label for Vault-origin accounts, not change account ownership.

## Verified findings

- Vault snapshot: `7d02cabe`. `src/routes/seeds.index.tsx` displays `s.fingerprint`; `src/lib/vault/seeds.ts::seedFingerprint` calculates the BIP32 **master fingerprint** from the normalized BIP39 words and stored extra password, then renders lowercase hexadecimal padded to eight characters. It is not eight decimal digits. Public BIP39 test vector: `73c5da0a`.
- SEEDS snapshot: `4b2a6ecd`. `src/lib/key-signin/submit.server.ts` currently creates a profile with `startingName(kind, identity)`. It does not accept fingerprint metadata yet. The authenticated-member link path is separate (`link.server.ts`).
- Vault's current answer does not include the fingerprint. Key cannot recover the master fingerprint from the account-1106 bundle or the identity address. Do not request the root private/public key or recovery words to solve naming.
- Snapshots are read-only. Neither other project has been changed from this chat. The following is a proposed backward-compatible extension implemented on **Key only**, pending their adoption and independent review.

## HME Vault request — paste into its project chat

Add authenticated display metadata to the existing v2 answer `body` in `src/lib/signer/branch-access.ts` (and its actual answer builder):

```ts
body.vault_fingerprint = fingerprint; // exactly /^[0-9a-f]{8}$/
body.vault_label_signature = signTxcMessage(
  identityKey,
  JSON.stringify(["HME Vault seed label", 1, handoff.message, fingerprint]),
).signature;
```

Recompute `fingerprint` from the selected seed using Vault's existing `seedFingerprint(words, storedPassphrase)` convention; never trust a backup's stored fingerprint. Use the same identity key and passphrase as the original coin handoff signature, TXC account 0 (signing only, not exported). The tuple is UTF-8 JSON.stringify, no trailing newline. Copy Key's `src/lib/seeds-key/vault-label.ts` for the exact transcript helper.

Keep `kind: "coin"`, identity address, pocket 1106, all 16 paths, sealed payload, existing handoff message and original signature **unchanged**. This is a second local signature, not a new wallet approval prompt or a new protocol version. Bind existing owner approval, cancellation, expiry and seed-selection safeguards to both signatures and final display. Preserve the bounded HMQR2 transport.

Do not transmit the private seed name, word count, mnemonic, passphrase, root xpub or root private key. The fingerprint is the only newly disclosed seed information. Include tests for `73c5da0a`, leading zeros, stored extra passwords, Unicode normalization and cancellation. Supply a reviewed APK and SHA256SUMS after the coordinated changes.

## SEEDS request — paste into its project chat

Key will forward optional `vault_fingerprint` and `vault_label_signature` in the existing submit POST after validating both. Add corresponding handling in `src/lib/key-signin/submit.server.ts`, **before** consuming the challenge or performing account/link side effects.

1. Neither field: preserve current behavior for older Vault APKs and coins/wallets.
2. Either field present: require both, strict eight lowercase hex characters, bounded signature, `kind === "coin"`, and the normal original handoff verification. Reject invalid metadata; do not silently fall back.
3. Reverify the second signature using the same authenticated TXC identity over exactly `JSON.stringify(["HME Vault seed label", 1, b.message, b.vault_fingerprint])`. Key is a relay, not a trusted naming authority. Use SEEDS' existing TXC signature verifier.
4. For new Vault-origin key accounts, set the default display name to `Vault ${fingerprint}`. For existing accounts, migrate only the exact system-generated Coin default; preserve user-chosen names. Store validated Vault provenance/fingerprint as display metadata if needed for future sign-ins. Handle the normal sign-in and authenticated-member link paths consistently, but never rename an existing Honest Money member's profile merely because they attach a Vault trading pocket; label that pocket instead.
5. Keep identity_kind/identity_address, profile IDs, membership, one-account checks, revocation, pocket correction and custody unchanged. Never find, merge or authorize accounts by this fingerprint.
6. Add tests for new account labeling, legacy fallback, partial/invalid/forged metadata, replay across handoffs, user-customized names, unchanged coin/wallet defaults, existing key-account migration and member-link pocket labels. Obtain review before release.

## Security meaning and compatibility

The fingerprint has only 32 bits: collisions are possible. The signature authenticates the identity owner's assertion of a label, not independent proof of its derivation from the root seed; Key and SEEDS cannot independently recompute it without root information. It must never control login, pocket derivation, ownership, uniqueness or matching. It permits cross-service seed correlation, so disclose it only for the owner-approved pair.

The second signature binds the fingerprint to the entire handoff message (including challenge, hosts, pocket, ordered paths and encrypted-payload hash), preventing relabeling or reuse on another handoff. Original protocol text and all key derivation remain untouched. Older APKs retain the Coin label rather than being rejected. Current SEEDS ignores these new fields; **its visible name will not change until its own implementation ships**.

## Review and acceptance

Key changes: `vault-label.ts`, `vault-label.test.ts`, `vault-link.ts`, `vault-link.test.ts`. Key rechecks optional metadata both on scan and immediately before POST; the verified fields are forwarded unchanged. No server, schema, shared verbatim file or host change.

Before publication: independent review of all three implementations; updated APK fingerprint/build evidence; disposable unfunded seed phone test. Compare the eight-character ID in Vault, Key and SEEDS, complete final confirmation and read the profile/pocket label back in SEEDS. Repeat with a stored extra password, an older APK, cancellation and a tampered label. Do not infer success from unit tests or a mocked POST.

Automated test results and current source hashes are supplied with this document after verification. The mandated built-output script performs its own build and cannot be run manually in this environment; rely on the automatic preview build signal here and rerun `node scripts/check-built-assets.mjs` in the release/auditor environment before approval.

### Observed Key verification — 2026-11-23

- Full suite: **159 tests passed in 17 files**, including eight new tests covering the eight-character identifier contract, legacy compatibility, signature requirements, unchanged identity/pocket, verified forwarding, tampering and replay rejection.
- Automatic preview build at `02:24:27Z`: **build OK**. No runtime error entry was present in the available telemetry.
- No protected verbatim source, dependencies, server logic, schema, host or route was edited. Root AGENTS.md was already at its size limit; the new architecture rule could not be added without altering protected existing instructions, so this document records it instead.
- Not exercised: updated Vault APK scan → live SEEDS label readback. Neither upstream project implements this extension in the checked snapshots. Tests use public dummy seed data and a synthetic labeled answer with a mocked POST, not a real member session or an independently reviewed updated APK.
- Publication not performed; third-party review remains required.

SHA-256 of tested Key source:

```text
b3871497bf90198a6c2d065c19b02934ec9c8747d6300596b220b3f5c4825fb5  src/lib/seeds-key/vault-label.ts
321c64665c201508b5c8983f183b6a3a2d2518ec3b36db97bd397f13029143e5  src/lib/seeds-key/vault-label.test.ts
526e30474c006881a648a1b60926a3da9719f83a420840e4102690beb66352c9  src/lib/seeds-key/vault-link.ts
156f73281c40e8b8f3b4daab30045da98cfb09c6e0fac5b0799e3b3a714df0a4  src/lib/seeds-key/vault-link.test.ts
```
