<div align="center">

# 🌱 Seeds Key

### Your coin is your key.

**Sign in to [Seeds Exchange](https://seeds.honest.money) with a Cold Storage Coin, your own wallet, a Ledger or HME Vault.<br/>No passwords. Your recovery phrase never leaves your device.**

[**key.seeds.honest.money**](https://key.seeds.honest.money) · [Seeds Exchange](https://seeds.honest.money) · [Honest Money](https://honest.money)

![TXC](https://img.shields.io/badge/TXC-TEXITcoin-2f6b3a) ![ISK](https://img.shields.io/badge/ISK-network-2f6b3a) ![ZCU](https://img.shields.io/badge/ZCU-ZeroChill-2f6b3a) ![No trackers](https://img.shields.io/badge/trackers-none-informational)

</div>

---

## ✨ What it does

Seeds Key is the front door to Seeds Exchange for anyone who already holds honest money. Instead of creating a password, you prove who you are with something you already own, and Seeds Key builds your personal **trading pocket** (pocket 1106) on your own device:

| Sign in with                          | How                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 🪙 **Cold Storage Coin**              | Scan the recovery-phrase QR under the seal                                                                      |
| 🔐 **HME Vault** · activation pending | Signed QR exchange with your offline Vault phone; requires the verified Seeds signer and matching Vault release |
| 🦊 **Your wallet**                    | MetaMask, Rabby, Coinbase Wallet or Phantom                                                                     |
| 🔌 **Ledger**                         | Directly over USB or Bluetooth (Ethereum app)                                                                   |

One sign-in sets up trading keys for **16 chain families**: TXC, ISK, Bitcoin, Litecoin, Ethereum / BNB / Base / PulseChain, Dogecoin, Bitcoin Cash, Zcash, XRP, TRON, Solana, Dash, Cosmos, THORChain, Cardano and Monero.

## 🛡️ Built to be trusted

- **Your phrase stays put.** It's never sent, saved, logged or shown. Only a signature and your sealed trading pocket go to Seeds.
- **Sealed end-to-end.** Pocket keys are encrypted to a one-time key that only Seeds can open.
- **Match codes.** A three-digit code on both screens stops someone else from hijacking your sign-in.
- **Same pocket every time.** The same coin or wallet always rebuilds the same pocket, and your savings account is never touched.
- **No trackers, no third-party scripts, no outside fonts.** A strict content security policy, and it only ever talks to Seeds.
- **Independent review required.** Changes must pass third-party security review before publication; hardware and coordinated sign-in checks remain release gates.

> **Custody note:** once you link, Seeds holds the trading keys for pocket 1106 so it can trade instantly. Keep your savings in your own wallet.

> **Revoking is not key rotation.** Re-linking uses the same pocket 1106 keys. If you suspect those keys were compromised, move funds to independently controlled keys and stop depositing into the old pocket.

## 🌍 Part of the Honest Money Ecosystem

Seeds Key is one tool in the **[Honest Money Ecosystem](https://honest.money)**. HME is a family of networks, coins and tools built for honest money.

| Coin                | About                                 | Build on it                                        |
| ------------------- | ------------------------------------- | -------------------------------------------------- |
| **TXC** · TEXITcoin | Bitcoin-style chain with Omni layer 2 | [texitcoin.org/build](https://texitcoin.org/build) |
| **ISK**             | TXC's sibling network                 | [honest.money](https://honest.money)               |
| **ZCU** · ZeroChill | The ZeroChill network                 | [zerochill.com/build](https://zerochill.com/build) |

**The family of tools:** Seeds Exchange · Seeds Key · HME Wallet · HME Vault · Cold Storage Coins. Find them all at [honest.money](https://honest.money).

## 🧑‍💻 For developers

Verification baseline: **Bun 1.4.4**. Use this version to reproduce the documented checks; the dependency lockfile is committed.

```bash
bun install --frozen-lockfile
bun run dev                        # local preview
bunx vitest run                    # full test suite, including published test vectors
node scripts/check-built-assets.mjs # release guard: builds and checks the shipped files
```

The tracked `src/routeTree.gen.ts` makes the first test run possible without a build. If an export omits it, run `bun run build` to regenerate it **before** testing. Do not hand-edit the generated file. The release guard already performs a production build; there is no need to build twice.

See [verification and shared-source hashes](docs/verification.md), [Vault v2 coordination](docs/hme-vault-link.md), and [security scope and disclosure status](SECURITY.md). Designated test pages accept only preview Seeds, never live Seeds; do not use real recovery phrases there.

Built with TanStack Start, React and Tailwind, and audited cryptography from [@noble](https://paulmillr.com/noble/) and [@scure](https://github.com/paulmillr/scure-base).

| Where                                     | What                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `src/lib/pockets/`, `src/lib/key-signin/` | Shared derivation and sign-in rules, copied byte-for-byte from Seeds            |
| `src/lib/seeds-key/`                      | Request checks, coin and wallet flows, Ledger, HME Vault link, security headers |
| `docs/hme-vault-link.md`                  | The HME Vault QR protocol                                                       |
| `AGENTS.md`                               | Project rules and why they exist                                                |

⚠️ The live address `key.seeds.honest.money` is permanent: wallet pockets are derived from it, so forks must use their own address and won't share pockets.

## 🔎 Security

Found a problem? Read [SECURITY.md](SECURITY.md) before reporting. A dedicated private reporting destination still needs confirmation; do not post sensitive findings, recovery phrases or keys in public issues.

Application source is [MIT licensed](LICENSE). The self-hosted fonts have separate SIL Open Font License notices: [Manrope](public/fonts/Manrope-OFL.txt) and [IBM Plex Mono](public/fonts/IBMPlexMono-OFL.txt). Asset-pointer storage IDs are public metadata, not credentials; preserve the pointers so logo delivery continues to work.

---

<div align="center">

**Part of the [honest.money](https://honest.money) ecosystem** · [Terms](https://key.seeds.honest.money/terms) · [Privacy](https://key.seeds.honest.money/privacy) · [Manifesto](https://key.seeds.honest.money/manifesto)

_Honest money, honest tools._ 🌱

</div>
