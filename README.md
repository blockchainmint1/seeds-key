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
3. Scan your coin's phrase QR, or sign with MetaMask, Rabby, Coinbase Wallet, Ledger/Trezor or Phantom.
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
- **Publication is held** pending independent re-audit, real-wallet origin-warning checks, and a complete live SEEDS confirmation flow.
- Static-only delivery, public built-file hashes/About screen and SRI from guide K4 remain separate release work; this project retains its existing TanStack Start architecture and nonce-protected SSR.

Permanent home: **https://key.seeds.honest.money** — never change it after wallet use. This is not a claim that the updated code has been published.

Honest money, honest tools.
