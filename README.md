# 🌱 Seeds Key

**The easy onramp to [Seeds Exchange](https://seeds.honest.money) for honest-money holders.**
Sign in with a **Cold Storage Coin** or **your own wallet** — your recovery phrase never leaves your device.

Part of the **[Honest Money Ecosystem](https://honest.money)**:

| Coin | Network |
| --- | --- |
| **TXC** — TEXITcoin | Bitcoin-style chain + Omni layer 2 · [texitcoin.org/build](https://texitcoin.org/build) |
| **ISK** | TXC's sibling network |
| **ZCU** — ZeroChill | [zerochill.com/build](https://zerochill.com/build) |

## How it works
1. Seeds sends you here with a one-time, 10-minute request.
2. Compare the three-digit match code with your own Seeds screen before continuing.
3. Scan your coin's phrase QR, or sign with MetaMask, Rabby, Coinbase Wallet or Phantom. Ledger can connect directly over USB/Bluetooth where the browser supports it, or through MetaMask/Rabby; Trezor uses a browser-wallet provider.
4. Compare the short coin/wallet name on both screens and finish the confirmation on Seeds. A pocket-key change stays pending until approved there.

## Safety
- No phrase is ever sent, saved or logged. No trackers or third-party scripts.
- Only talks to Seeds (strict allow-list), with a strict Content-Security-Policy.
- Matches every published test vector (`bunx vitest run`).

## Verification and release status
- Reference code is copied byte-for-byte from SEEDS snapshot **d6de39aa**, following `docs/seeds-key-page.md` v3.
- Wallet pockets use the permanent v2 SIWE/SIWS message fields and HKDF label. Coin address vectors are unchanged.
- Phantom native `signIn` is preferred; signatures for reformatted text are discarded. The fallback signs Seeds' exact bytes through `signMessage` and still requires repeatability.
- Run `bun install --frozen-lockfile` and `bunx vitest run` for the test suite. The auditor packet includes the generated route tree, source hashes and verification limitations.
- **Publication is held.** The v3 re-audit confirms forwarded-link session theft (H2), Solana signature phishing (H1) and EVM recovery-byte compatibility (M4) remain unresolved. Direct Ledger also needs independent re-audit, real-device checks and a complete live SEEDS flow; it does not inherit MetaMask's origin warning.
- Static-only delivery, public built-file hashes/About screen and SRI from guide K4 remain separate release work; this project retains its existing TanStack Start architecture and nonce-protected SSR.

Permanent home: **https://key.seeds.honest.money** — never change it after wallet use. This is not a claim that the updated code has been published.

Honest money, honest tools.

## Direct Ledger support
- Uses Ledger's Ethereum app and official WebHID (USB) / Web Bluetooth transports. Both require a secure context and a supporting browser; API detection is not a hardware compatibility guarantee.
- Default Ethereum path: `m/44'/60'/0'/0/0`. An Ethereum-only path selector supports existing Ledger Live or legacy accounts; path changes select a different wallet identity, not a migration.
- Confirm the address on Ledger, then approve the same two deterministic pocket signatures and final handoff signature as the existing EVM flow. No hardware seed, xpub export, transactions or RPC providers are used.
- No recovery-byte normalisation is introduced. Only Ledger's expected 27/28 recovery bytes are accepted; unsupported responses fail before submission.
- Cancellation and disconnect stop pending work; transports are closed after every outcome. Browser permission grants are not revoked by closing the connection.
- SDK packages are bundled locally. The reused WebHID/Web BLE transport packages are deprecated by Ledger in favour of its Device Management Kit transports; this is an explicit maintenance risk for the auditor, not a claim that the EVM Wallet reference is the newest integration architecture.
- Approved clock repair allows issued-at up to 60 seconds ahead; expiry stays strict, and the shared ten-minute request lifetime is unchanged.
