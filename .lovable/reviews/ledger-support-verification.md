# Seeds Key — Ledger USB/Bluetooth and approved audit repairs

Date: 2026-11-21 UTC. Release decision: **HOLD**. This report and source packet support independent review; they do not clear publication.

## Changes and provenance

- Adapted connection patterns from EVM Wallet project `44dd13d0-3b6e-44e3-91bd-dbbae134e0f3`, read-only snapshot `8eb4da0b`. Not a verbatim copy: transaction broadcasting, RPC, account-xpub export, persistent state and diagnostic logging were deliberately excluded.
- Added direct Ethereum Ledger USB/WebHID and Web Bluetooth controls after the existing Continue gate. Both transports use the Ethereum app. No Solana Ledger support is claimed.
- Default address path `m/44'/60'/0'/0/0`; explicit Ethereum-only path input permits existing Ledger Live/legacy paths. Address confirmation is requested on-device before signatures. Changing paths changes account identity; no discovery or automatic migration is implemented.
- Official SDK packages installed: hw-app-eth 7.13.1, hw-transport 6.37.0, WebHID 6.36.0 and Web BLE 6.35.0; browser Buffer 6.0.3 and events 3.3.0. SDK code is dynamically loaded after Continue, never executed during SSR. Browser-safe aliases prevent empty built-in stubs; no third-party script hosts added.
- **Maintenance limitation:** Ledger marks WebHID and Web BLE packages deprecated in favour of Device Management Kit transports. This implementation follows the requested EVM Wallet reference, using the latest resolved versions in that architecture, not a claim of the latest Ledger architecture. Review or replace the transports before release as warranted.
- A prepared SDK opens its device picker directly from the click. There is no automatic device selection. HID uses explicit request; BLE uses create. Capability detection checks secure context and browser API presence, not model compatibility or editor-frame permissions.
- The Ledger adapter reuses the EVM three-signature flow: two identical pocket messages followed by the host/time/challenge/pocket-bound handoff message. No shared reference files or pocket-message/HKDF bytes changed. Ledger r/s/v is formatted as personal_sign bytes, accepting only the SDK's expected v=27/28. It does not normalise existing 0/1 signatures; M4 remains unresolved.
- Transports close after success, failure, cancellation and unmount; disconnect aborts work. Abort checks prevent late device signatures being posted after cancellation and abort the fetch. Cancellation after a POST has reached SEEDS is not server-side rollback. Browser device permission grants are not revoked by closing a transport.
- No application Ledger logs or SDK log subscriptions; no recovery phrase entered, hardware seed exported, transactions signed or RPC providers contacted by this adapter. Immutable signature strings cannot be securely erased by JavaScript, as previously documented.
- Approved audit follow-ups: issued-at may be up to **60,000 ms** ahead of client time; expiry remains strict and the ten-minute shared lifetime unchanged. Future/locally expired errors are separated from SEEDS' used/expired warnings. Added native SIWS parser field/resource coverage without changing fallback policy or signed messages.

## Verification

- Fresh full regression suite: **70/70 tests across 9 files passed**. Includes 11 Ledger tests (both transports, exact personal-sign vector, address confirmation, path bounds, prohibited requests, rejection, nonrepeatability, cancellation, disconnect and expiry), two clock-boundary tests and one exact SIWS input test. Existing tests continue to pass.
- Latest platform automatic build/typecheck: **build OK**, 2026-11-21T20:44:27Z. No manual production build/typecheck run.
- Browser checks at **1280×1800** and **393×852**: SDKs absent before Continue; real bundled SDKs load successfully with Buffer support; actual SDK device-picker calls using simulated browser APIs cancel with no POST; controls and error states render; mobile buttons/path fit without horizontal overflow. No page errors.
- Separate simulated complete UI flows for USB and Bluetooth each confirm address, request three signatures, send a sealed handoff, display held confirmation and signer name, and close transport once. Both end at localhost `/` with the wallet request query. Device SDK signing and SEEDS responses are mocked; unit signatures use the public guide test key. These are not real-hardware or live-session verification.
- All four content routes inspected and rendered with unique titles, descriptions, Open Graph title/description/type and Twitter card. Existing self-hosted branding preserved.
- Fresh dependency audit: **25 advisory entries across 9 package names: 13 high, 10 moderate, 2 low**. Earlier packet had 24 across 8 names. New low advisory is `elliptic` 6.6.1 (GHSA-848j-6mx2-7j84), introduced transitively by hw-app-eth through ethers v5. Unlike the earlier tooling-only summary, the newly added dependency is in the runtime SDK dependency tree. No exploitability or effective tree-shaking claim made. Raw audit and dependency path evidence included; no advisories claimed fixed.

## Release blockers and unchanged risk

1. Physical Ledger models, firmware, Ethereum app versions, USB/Bluetooth browsers, address screen, exact message/device display and signature repeatability remain **unverified**. No hardware is attached to this sandbox.
2. No complete live SEEDS session, physical coin scan, deployed permanent-host protection/cache check or actual editor-frame device-permission behaviour verified.
3. H2 remains open in the jointly reviewed protocol: originating-browser session delivery must change in SEEDS. Match code and held-key confirmation are not sufficient.
4. EVM H1 relies on tested wallet-origin warnings; **direct Ledger does not inherit MetaMask/Rabby domain mismatch checks**. UI explicitly warns, but user education is not cryptographic origin enforcement. An attacker can request the same fixed pocket signature. Direct support adds a path requiring independent launch approval.
5. Solana H1 remains open; removing Key's fallback alone cannot stop another origin requesting the signature. Phantom native/fallback behaviour is unchanged.
6. M4 recovery-byte canonicalisation needs a shared SEEDS decision and member-history evidence before changing derived pockets. Host remains `key.seeds.honest.money`.
7. Deprecated transport maintenance, the new elliptic advisory, K4 asset hashes/SRI/static delivery and previously deferred header decisions remain review items, not solved here.

## Packet contents

Clean current source including generated route tree, lockfile, tests, existing review documents, current source revision, complete binary-capable request patch, SHA-256 inventory, raw test/audit/build signals and browser scripts/results/screenshots. No repository metadata, environment files, dependencies or generated build output. The bundle does not include SEEDS backend source or private member history; review the SEEDS session-delivery implementation separately.