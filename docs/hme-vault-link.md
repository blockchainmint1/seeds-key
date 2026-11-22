# HME Vault → Seeds: signed QR exchange v2

Approved by Bobby, Nov 22 2026: Vault may export **pocket 1106 only**, sealed to SEEDS, through offline QR exchange after owner confirmation. Account 0 and the recovery phrase never leave Vault. Re-linking after revocation still uses 1106. Do not change deterministic derivation or wallet signing messages.

Revocation removes application access; it is **not key rotation**. Re-linking derives the same pocket keys. If those keys may have been compromised, move funds to independently controlled keys and do not send new funds to the old pocket. SEEDS must present this warning on its revoke screen; Key cannot revoke or rotate keys held elsewhere.

## Coordinated prerequisite

The Key-side production trust map is deliberately empty. No Vault request QR is displayed until SEEDS supplies a signed request and its independently verified signing public key is pinned in both Key and Vault. Existing coin, wallet and Ledger paths remain separate. Do not enable unsigned fallback. Do not use the test signing key from `src/test/vault-fixture.ts`.

## SEEDS work (in the SEEDS project)

1. Provision a dedicated Ed25519 request-signing key in secure server configuration. Keep the private key server-only, separate from the one-time X25519 encryption keys. Supply the verified public key (32 bytes, base64url without padding) and stable `signing_key_id` to Key and Vault through an authenticated release process; never obtain trust from a QR.
2. Include a nested `vault_request` object in the existing validated manifest. Its exact fields are `type`, `v`, `signing_key_id`, `request_sig`, `domain`, `key_host`, `challenge_id`, `challenge`, `recipient_pubkey`, `pocket`, `issued_at`, `expires_at`, `paths`. Set type to `hm-seeds-key-vault-request`, v to 2, pocket to 1106 and paths to the exact ordered 16-chain list from `POCKET_COINS.map(c => accountPath(c, 1106))`. Mirror the manifest's recipient, challenge, host and ISO timestamps exactly. App name is fixed by trusted UI, not accepted from the QR.
3. Sign the bytes from `vaultRequestBytes` in `vault-protocol.ts`. Canonical bytes are UTF-8 of `JSON.stringify(["HME Seeds Vault request", type, v, signing_key_id, domain, key_host, challenge_id, challenge, recipient_pubkey, pocket, issued_at, expires_at, paths])`, with no whitespace or trailing newline. `request_sig` is the 64-byte Ed25519 signature encoded base64url without padding. The existing sign-in message and sealed-key submit payload stay unchanged.
4. Add server tests for exact field binding, canonical-byte agreement, 1106 after revoke, signature verification and secret exclusion from browser output. Both timestamps must round-trip byte-for-byte through `new Date(value).toISOString()`, including three millisecond digits and uppercase `Z` (for example `2026-11-22T15:13:00.000Z`); alternate timezone offsets or omitted milliseconds are rejected even when signed. Assert this exact contract in SEEDS' server tests. Implement this using SEEDS' existing server boundaries, not a new Key backend.
5. Plan key rotation: distribute and verify a new public key in Key and offline Vault first, allow an audited overlap, then retire the old key. Do not offer network fetching or QR-based trust-on-first-use in Vault. Retiring a compromised key requires an authenticated Vault update.

## Vault work (in the HME Vault project)

Copy these files and their dependencies from Key:
- `src/lib/pockets/*` and `src/lib/key-signin/{rules,seeds-key-reference}.ts`, verbatim SEEDS copies.
- `src/lib/seeds-key/vault-protocol.ts` and `vault-link-reference.ts`. The reference no longer imports the Key validator module; protocol constants and canonical verification are browser/offline-safe.
- Pin the same independently verified production public key in `SEEDS_REQUEST_KEYS` using its exact key ID. Do not include test fixtures in application code.

Use existing @noble/curves 2.x, @noble/hashes 2.x, @scure/base, @scure/bip32 and @scure/bip39 dependencies. Keep the APK without network permissions.

1. On an unlocked seed, scan and call `readVaultRequest(text)` **before key derivation**. It requires a pinned valid signature, exact live hosts, pocket 1106, exact paths, supported v2, a ten-minute maximum lifetime and strict unexpired time (at most 60 seconds future issued-at skew). A wrong offline clock must be corrected before proceeding; it is not a bypass.
2. Show the selected seed's existing name, trusted “Seeds Exchange” name, match code and “pocket 1106 — all 16 chains”. Require existing sensitive-action confirmation. Show: **“Seeds will be able to trade from pocket 1106 without asking you again. Your savings and recovery phrase stay on this phone.”** Also warn: **“Only link from a Seeds screen you started yourself.”**
3. Call `buildVaultResponse(req, words)`, which verifies again before deriving and before displaying the result. Show the sealed answer using existing modern HMQR2 animated QR. Response envelope v is now 2; the internal SEEDS submit message/body are unchanged.
4. Release request/response and phrase references when closing, cancelling, locking or expiring. Never log, display, persist or send recovery words, private keys or signatures to diagnostics. JavaScript strings cannot be guaranteed zeroed; do not promise zeroization.
5. Test signature/recipient substitution, unsigned/expired requests, wrong clock, wrong pocket/savings paths, match code, cross-project acceptance and a real mid-range phone camera. SEEDS and Vault source changes cannot be pushed from the Key chat.

## Key verification and scanning

The ordered 16-chain path list is a coordinated v2 contract. Adding, removing or reordering a chain requires a new protocol version and matching audited changes in SEEDS, Key and Vault; do not add a seventeenth `POCKET_COINS` entry unilaterally. The validator reconstructs its expected paths from that shared list; it cannot coordinate mismatched installations automatically.

The Vault choice is hidden when `vault_request` is absent. A present value still must pass signature and manifest binding checks, including the pinned signer policy. The request QR is rendered at 420 px with error correction M and scales down to fit the screen; real-phone scanning remains unverified until the coordinated test.

Designated Key previews and development localhost accept only preview SEEDS requests, not live SEEDS. The v2 offline Vault protocol remains live-host-only and its production trust map remains empty; these repairs do not activate Vault in either environment. Never use real recovery phrases on editor previews.

Key binds the signed request to its current validated manifest before drawing the request QR and again before POST. It checks answer challenge, kind, pocket, all chain paths, xpub presence, rebuilt message including payload hash, and the TXC identity signature. Only SEEDS can decrypt and verify the actual private-key/public-key matches (`checkXprvMatches` in current SEEDS submit code).

Key accepts modern HMQR2 only (legacy parts are refused), caps aggregate answer text at 64 KB and frame count at 274, verifies session consistency and checksum through the unchanged Vault collector, checks expiry during scanning and caps scanning at two minutes or expiry, whichever comes first. Cancellation/unmount aborts pending handoff work and suppresses late success; it cannot undo a POST already accepted by SEEDS.

A signed request prevents an attacker replacing the encryption recipient. It does not prove ownership of the receiving Seeds browser session or prevent forwarding a genuine request; those checks require coordinated SEEDS work. Do not publish new changes until independent review and coordinated real-phone verification.

Source provenance and verification steps: [verification.md](verification.md). The shared derivation and sign-in files remain verbatim copies; no copies were edited for these re-audit repairs.
