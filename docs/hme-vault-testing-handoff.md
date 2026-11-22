# Final request: HME Vault → SEEDS testing handoff

**For:** the HME Vault project chat  
**Prepared for Bobby:** November 22, 2026  
**Scope:** finish the offline, owner-approved pocket-1106 link and prepare it for coordinated testing—not publication.

## Copy this request into HME Vault

Please finish **“Link to SEEDS”** using the signed-request v2 protocol already prepared in Vault. SEEDS should receive the selected seed’s **pocket 1106 private/public key material for all 16 required key families**, encrypted to SEEDS’ one-time recipient. The recovery phrase, its optional BIP39 passphrase, master private keys and savings private keys must never leave Vault.

This is a deliberate, narrowly scoped trading-key delegation—not ordinary public-only pairing. After linking, SEEDS holds the pocket keys and can trade without asking the offline Vault again. Re-linking after revocation uses **the same pocket 1106**, not a new account; revocation is not key rotation.

### 1. Start from what is already built

The Vault snapshot reviewed for this request is **`adbee660`**. It already contains:

- `src/lib/signer/seeds-request.ts`: offline signed-v2 verification, exact hosts and ordered paths, time checks, invalid-recipient rejection, and an empty production signer trust map.
- `src/lib/signer/seeds-request.test.ts`: verifier tests.
- `docs/seeds-signed-request-handoff.md`: the upstream signing contract and remaining export work.
- Existing sensitive confirmations, encrypted seed storage and 240-character HMQR2 transfers.

The Seeds Key baseline is **`d042c130c696c4b4f4b90351871b52445457db4e`**. Obtain a fresh read-only snapshot of Seeds Key, project **`73bea008-b73f-48d4-9f72-8c26ed9d32ff`**, and compare the current protocol before implementing.

Use these Key files as interoperability references:

- `src/lib/seeds-key/vault-protocol.ts`
- `src/lib/seeds-key/vault-link-reference.ts`
- `src/lib/seeds-key/vault-link.ts`
- `src/lib/key-signin/{rules,seeds-key-reference}.ts`
- `src/lib/pockets/*`
- `docs/hme-vault-link.md`

**Do not copy the response reference blindly.** Its `buildVaultResponse(req, words)` does not carry Vault’s stored BIP39 passphrase or enforce hands-off restrictions. Build a reviewed Vault adapter that does both. Preserve the shared SEEDS derivation/message contract; do not edit verbatim upstream copies locally. Do not replace Vault’s existing Noble 1.9.7 dependencies with Key’s 2.x dependencies as part of this task—adapt APIs in Vault-owned code and prove byte compatibility with tests.

### 2. Build the owner-approved screen

On an unlocked, eligible seed, add **“Link to SEEDS”**:

1. Scan the request QR from the Key page. Use Vault’s production `readSeedsRequest(text)` before any seed/private-key derivation. Do not allow the screen to inject a signer key or trust map.
2. Show the selected seed’s existing name, trusted **“Seeds Exchange”** name, pairing/match code, and **“Pocket 1106 — all 16 key families.”** Do not take the app name from the QR.
3. Require the owner to match the code against their SEEDS screen and use Vault’s existing sensitive-action confirmation.
4. Show these warnings before approval:

   > Seeds will be able to trade from pocket 1106 without asking you again. Your savings and recovery phrase stay on this phone.

   > Only link from a Seeds screen you started yourself.

   > Revoking access does not change these keys. If the pocket keys are compromised, move funds to independently controlled keys.

5. Bind approval to the exact verified request and selected seed. Selection changes, close, cancel, lock or expiry must invalidate approval and stop late answer display.
6. Reject **hands-off seeds at the callable export boundary**, not just by hiding the button. Do not expose them through another caller.
7. Reverify the pinned signature and expiry immediately before derivation and immediately before displaying the encrypted answer.
8. Display the answer as modern **HMQR2**, using **240-character parts** and existing pause, step and part-count controls. Key must reconstruct an answer no larger than **65,536 characters** and no more than **274 frames**.

Keep the APK offline with zero network permissions. No requests, new backend, analytics, diagnostic subscriptions or fetched signing keys. Keep ordinary pairing, backups and payment signing unchanged. Drop in-memory request, answer and secret references on cancellation, locking and expiry; wipe mutable secret buffers where possible without promising JavaScript string zeroization.

### 3. Derive and seal exactly the right keys

Use the selected seed’s **stored optional BIP39 passphrase** consistently for the TXC identity, BIP32 families, SLIP-0010 families and Cardano’s existing Icarus derivation. An omitted passphrase creates a different wallet. Never include the passphrase in the answer.

The ordered v2 contract is:

| Order | Key family | Delegated path |
|---:|---|---|
| 1 | TXC | `m/44'/696969'/1106'` |
| 2 | ISK | `m/44'/969696'/1106'` |
| 3 | BTC | `m/84'/0'/1106'` |
| 4 | LTC | `m/44'/2'/1106'` |
| 5 | EVM | `m/44'/60'/1106'` |
| 6 | DOGE | `m/44'/3'/1106'` |
| 7 | BCH | `m/44'/145'/1106'` |
| 8 | ZEC | `m/44'/133'/1106'` |
| 9 | XRP | `m/44'/144'/1106'` |
| 10 | TRX | `m/44'/195'/1106'` |
| 11 | SOL | `m/44'/501'/1106'/0'` |
| 12 | DASH | `m/44'/5'/1106'` |
| 13 | ATOM | `m/44'/118'/1106'` |
| 14 | RUNE | `m/44'/931'/1106'` |
| 15 | ADA | `m/1852'/1815'/1106'` |
| 16 | XMR | `m/44'/128'/1106'` |

Do not filter this list to Vault’s supported-payment coins, omit a family, reorder it or add a seventeenth family without a coordinated protocol update. Export compatibility does **not** mean every family has working SEEDS spending support.

Preserve the existing formats:

- BIP32/secp256k1 families: account extended private/public keys in the shared SEEDS format.
- SOL: hex 32-byte SLIP-0010 private key and base58 public key.
- ADA: hex 96-byte account extended private key (`kL || kR || chain code`) and hex 64-byte public key (`A || chain code`).
- XMR: hex 32-byte SLIP-0010 seed key using SEEDS’ Trezor-compatible Monero derivation, paired with the Monero primary address—not a BIP32 xpriv or Ledger-style Monero wallet.

Seal `JSON.stringify(xprvs)` to the **verified request’s** X25519 recipient using the unchanged `hm-link-delegate v1` format: ephemeral public key (32 bytes), nonce (12 bytes), AES-256-GCM ciphertext and tag. Keep the existing HKDF-SHA256 inputs and exact TXC sign-in message.

Sign locally with the selected seed’s TXC identity at **`m/44'/696969'/0'/0/0`**. This account-0 key is used only to sign; **no account-0 private key is exported**. The public identity address and its signature are part of the intended handoff; neither belongs in diagnostics.

Return this outer JSON envelope:

```text
{
  type: "hm-seeds-key-vault-response",
  v: 2,
  challenge_id: <verified request challenge_id>,
  message: <exact shared SEEDS sign-in message>,
  signature: <TXC compressed Bitcoin-style message signature, base64>,
  body: {
    token: <same challenge_id>,
    kind: "coin",
    identity_address: <selected seed's TXC identity>,
    account: 1106,
    paths: <exact ordered list above>,
    xpubs: <all 16 public entries>,
    payload: <sealed private-key bundle, base64url without padding>
  }
}
```

Angle-bracket values above describe fields, not literal JSON. No plaintext private keys, recovery words, passphrase or master key may appear anywhere in the outer answer.

### 4. Coordinate the signing prerequisite with SEEDS and Key

Vault and Key currently have **empty production signer trust maps**. Leave them empty until SEEDS supplies an independently authenticated production public key. Do not add a temporary signer, unsigned fallback or QR-supplied trust.

The SEEDS project (**`0ce4bcf5-5883-4de0-96d3-b161585d1bf4`**) must provide:

- Dedicated server-only Ed25519 request signing, separate from one-time X25519 encryption keys.
- A nested signed `vault_request` in its existing manifest, generated from server-controlled challenge/recipient/host/time values.
- Stable `signing_key_id`, canonical unpadded base64url **32-byte public key**, SHA-256 fingerprint of the decoded public-key bytes, and an authenticated release record. **Never send the private signing key.**
- A signed non-sensitive fixture for interoperability tests, issuance test results and a reviewed key-rotation procedure. An archived fixture needs a fixed test clock; it is not a fresh live sign-in request.
- Existing challenge expiry, consumption, session authorization and decrypted private/public-key matching checks retained, with genuine-request forwarding/session delivery evaluated rather than assuming signatures solve them.

Pin the same verified key ID/public key in Vault and Key through their controlled release process. SEEDS’ latest implementation was **not** freshly checked for this document; ask that project to confirm what is complete and return the public handoff.

Signed request fields are `type`, `v`, `signing_key_id`, `request_sig`, `domain`, `key_host`, `challenge_id`, `challenge`, `recipient_pubkey`, `pocket`, `issued_at`, `expires_at`, `paths`. Type is `hm-seeds-key-vault-request`, version is `2`, pocket is `1106`, and hosts are **`seeds.honest.money`** and **`key.seeds.honest.money`**.

The ordinary Ed25519 signature covers UTF-8 of exactly:

```ts
JSON.stringify([
  "HME Seeds Vault request", type, v, signing_key_id,
  domain, key_host, challenge_id, challenge, recipient_pubkey,
  pocket, issued_at, expires_at, paths,
])
```

No BOM, added whitespace, trailing newline, prehash or changed tuple order. Signature encoding is unpadded canonical base64url (64 decoded bytes). Timestamps must exactly round-trip through `Date.toISOString()`, including three millisecond digits and uppercase `Z`. Maximum request lifetime is **600,000 ms**; issuance may be at most **60,000 ms** ahead of the Vault clock; expiry must be strictly in the future. Wrong clocks require correction, not an override. Request text is capped at **8,192 characters**.

Key separately binds all shared fields to its current validated manifest, checks the answer and submits once. It does not decrypt the private-key bundle; SEEDS must verify the decrypted keys match the supplied public entries before accepting/storing them.

### 5. Tests required before calling this ready

Use deliberately disposable, unfunded test seeds only. Never upload real recovery phrases, passphrases, sign-in capabilities or private keys to chats or audit files.

- **Derivation:** known vectors for all 16 families with empty and non-empty BIP39 passphrases; identity uses the same passphrase; decrypted private/public entries match the shared contract. Include normalization-sensitive passphrase vectors.
- **Scope:** exported plaintext contains exactly the 16 pocket-1106 private entries; no savings/master keys or recovery credentials; hands-off seeds fail through direct calls; revoke/re-link stays on 1106.
- **Authentication:** altered signature, recipient, host, token, challenge, path, order, timestamp, signer ID and QR-provided key are refused before derivation. Reject unsigned/v1 requests, low-order recipients and pockets 0, 1107 and 2105.
- **Time:** exact expiry, ten-minute lifetime and 60-second future-skew boundaries, omitted milliseconds/timezone alternatives, wrong offline clock and expiry during derivation/display.
- **Interoperability:** exact signing bytes across projects; Vault’s answer passes Key’s `readVaultResponse`; disposable-fixture decryption proves every private/public match; existing SEEDS submit contract remains unchanged.
- **Lifecycle:** cancel, close, lock and seed changes during confirmation/derivation/QR display produce no late answer; cleanup occurs on errors. Key-side cancellation must not show late success, while acknowledging cancellation cannot undo an already accepted POST.
- **QR:** actual modern 240-character HMQR2 round trip, duplicate/out-of-order parts, mixed sessions, oversized/truncated streams, checksums and timeouts. Key’s scan ends at two minutes or request expiry, whichever comes first.
- **Regression:** ordinary public pairing, hands-off protections, backups and payment signing still pass; APK build inspection confirms zero network permissions and no accidental private-data diagnostics.

### 6. Coordinated real-phone acceptance test

After independent review and explicit authorization for any required deployment:

1. Install the reviewed offline APK on a real mid-range Android phone and select a disposable unfunded seed. Correct its clock while keeping it offline.
2. Start a fresh sign-in yourself at **`https://seeds.honest.money`**, open **`https://key.seeds.honest.money`**, compare the code and press Continue.
3. Scan Key’s request on Vault, review the seed/pocket/authority warning, and approve.
4. Scan Vault’s animated answer on Key. Confirm SEEDS’ final confirmation/held-change state is respected, and verify the linked pocket and expected public addresses read back in SEEDS.
5. Repeat with a passphrase-protected disposable seed and exercise cancellation, expiry and wrong-clock failures on the actual phone.

**Do not route real keys through editor previews.** Designated Key previews/localhost trust only preview SEEDS, whereas Vault v2 is live-host-only; relaxing either policy is not an acceptable test shortcut. Offline fixtures and dummy-seed automated tests can proceed before production activation, but they are not proof of a completed live link.

### 7. Return this to Bobby and Seeds Key

- Vault source commit and a concise list of completed changes and remaining blockers.
- Test commands, actual counts/results and cross-project vector/decryption evidence, excluding private test material from the report.
- A reviewed APK and instructions to obtain/install it, with zero-network-permission inspection evidence and supported device/build details.
- A shareable independent-audit source packet: source/configuration, lockfile, generated routes, license notices and source hashes; exclude repository metadata, dependencies, build output, environment files and private review notes.
- Screenshots of the new warning/confirmation and QR screens using dummy data only; no real sign-in QR or recoverable secrets.
- Public signer handoff status, coordinated phone-test results, and clear separation of “implemented,” “locally tested,” “phone tested” and “live sign-in verified.”

Prepare the implementation without repeatedly asking Bobby to reconfirm pocket 1106 or signed-only protection. **Do not publish new changes or describe Vault linking as active until independent review, prerequisites and authorized coordinated testing are complete.**

---

This document is a final implementation/testing request, not a security audit, production signer handoff or claim that a live Vault link has already succeeded. This Seeds Key chat can read Vault snapshots but cannot make changes in the Vault project.