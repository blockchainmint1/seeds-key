# HME Vault → Seeds link (paste into the HME Vault chat)

Approved by Bobby, Nov 22 2026: HME Vault may hand Seeds the **pocket 1106** trading keys for every Seeds chain, through QR codes only. This is a deliberate, narrow exception to "Vault never sends private keys": only pocket 1106, only sealed to Seeds, only after the owner approves. Savings (account 0) and the recovery phrase never leave the phone. Vault stays fully offline.

## Copy these files verbatim from the Seeds Key project (never edit them in Vault)
- `src/lib/pockets/*` (coins, derive, encode, slip10, cardano, monero)
- `src/lib/key-signin/rules.ts`, `src/lib/key-signin/seeds-key-reference.ts`
- `src/lib/seeds-key/vault-link-reference.ts` and the two constants it imports from `vault-link.ts` (`VAULT_REQUEST = "hm-seeds-key-vault-request"`, `VAULT_RESPONSE = "hm-seeds-key-vault-response"`)
Needed libraries: @noble/curves 2.x, @noble/hashes 2.x, @scure/base, @scure/bip32, @scure/bip39.

## Screen: "Link to Seeds" (on an unlocked seed)
1. Scan the Seeds Key page's QR. `readVaultRequest(text)` refuses anything not from `key.seeds.honest.money` / `seeds.honest.money` or not pocket 1106.
2. Show: app name, **match code** (`matchCode`), "pocket 1106 — all 16 chains", and a plain warning: *"Seeds will be able to trade from pocket 1106 without asking you again. Your savings and recovery phrase stay on this phone."* Require a confirm (same sensitive-action confirmation the Vault already uses).
3. `await buildVaultResponse(req, words)` → show it with the existing `AnimatedQr` (HMQR2, default 600-char parts; about 12 parts). Never show the words or the keys.
4. Drop the response text from memory when the screen closes or the Vault locks.

## Rules for the Vault project
- No network code added; the APK keeps zero network permissions.
- Vault's clock may be wrong offline; Seeds Key enforces expiry before sending, so Vault only warns when `expires_at` looks past.
- Signs as the seed's TXC identity (m/44'/696969'/0'/0/0) with kind "coin": the same seed used as a Cold Storage Coin opens the same Seeds account.
- Add a test that `buildVaultResponse` output passes Seeds Key's `readVaultResponse` (see Seeds Key `src/lib/seeds-key/vault-link.test.ts`).
