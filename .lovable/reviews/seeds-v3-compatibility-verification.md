# Seeds Key — SEEDS v3 compatibility auditor handoff

**Date:** 2026-11-21 UTC. **Release decision:** HOLD; this is implementation evidence, not an independent security clearance.

## Inputs and compatibility decision

- Requested by Bobby through `seeds-key-catch-up-prompt.md`, originating in the SEEDS project.
- Authoritative read-only SEEDS snapshot: `d6de39aa`, project `0ce4bcf5-5883-4de0-96d3-b161585d1bf4`.
- Specification: that snapshot's `docs/seeds-key-page.md`, build guide v3; included in the auditor packet.
- The previous hold on outside-wallet derivation was reconsidered for this explicitly requested compatibility update. SEEDS documents that v1 was never used by members. That is the source project's assertion, **not independently verified member-history evidence**.
- Coin sign-in text and coin derivation remain unchanged. Outside-wallet text/signatures/derived pockets intentionally change to v2. If anyone did use v1, do not publish without a recovery/migration decision.
- Permanent live host remains `key.seeds.honest.money`. No domain settings, backend, published release or SEEDS project code were changed.

## Implemented

1. Re-copied `rules.ts`, `seeds-key-reference.ts`, and the six client pocket modules (`coins`, `encode`, `slip10`, `cardano`, `monero`, `derive`) byte-for-byte. Additional server-only SEEDS pocket modules were deliberately not imported into this client key page. All eight copied files compare equal to the snapshot; hashes are included.
2. Retained exact endpoint/origin allow-lists, development-only localhost preview trust, expiry checks, pocket bounds, cookie omission and redirect rejection. Untrusted manifest branding still cannot override validated SEEDS identity.
3. Require `key_host` to equal the current page's host, `issued_at` to be valid and non-future, issued-before-expiry and a lifetime no longer than the shared ten-minute rule, and `pairing_code` to equal the computed challenge code. Preserve all three fields for signing.
4. Show the guide's match-code warning and Continue before mounting scan/connect controls. Revalidate at Continue, before provider/derivation work and before POST.
5. Show `shortKeyName` after deriving the coin identity or connecting a wallet, and retain it on the result screen.
6. Use SIWE/SIWS fixed pocket text with host/kind/address and the v2 HKDF label. The final wallet signature includes Key host, request times, one-time challenge, pocket/path resources and sealed-payload hash.
7. Prefer `window.phantom.solana.signIn` with fields taken from Seeds' exact text. Require byte-for-byte `signedMessage` equality and a 64-byte signature before using a native signature. Discard nonmatching native signatures, then fall back to `signMessage` on Seeds' exact bytes with the address-bar warning. The same fallback applies when native sign-in is absent; repeatability is still mandatory. Generic discovery of all Wallet Standard wallets is not added; the existing Phantom integration is covered.
8. Repeatability checks remain mandatory. Clear Solana signature arrays on mismatch, cancellation of the second prompt, after use and after final handoff signing. JavaScript immutable phrase/signature strings cannot be guaranteed erased from engine memory; no claim of secure string erasure is made.
9. Treat `200 signed_in:false, needs_confirm:true` as held confirmation, not success. Require explicit `signed_in:true` for an accepted response. The accepted screen also asks the member to finish identity confirmation in SEEDS rather than asserting a browser session already exists. Preserve validated `use_pocket` retries with a maximum of five attempts and actionable used/expired wording.

## Verification performed

- **56/56 tests pass across 8 files**, including all prior regression coverage plus guide vectors, exact EVM personal-sign signature, v2 phrase, EIP-55, challenge `c × 48` → match code `673`, host/time/code rejection, pending-result semantics, match gate, EVM handoff and Phantom native/fallback flows.
- Crypto-provider tests use only public guide keys and synthetic Solana keys. EVM and Solana signatures in these tests are genuine cryptographic signatures over the exact generated text; POST responses are mocked. No real member recovery phrase or credentials were used.
- **Latest automatic build/typecheck: build OK.** This project's build was not manually run; the platform performs it after edits.
- Browser checks at **1280×1800** and **393×852**: match code before any controls, mock EVM three-signature flow, held change without signed-in success, signer display, accepted response asking for SEEDS confirmation, wrong pairing code rejected, mobile controls without horizontal overflow, and all four content pages with individual metadata. No browser page errors. Screenshots and the browser script/results are included.
- All eight reference files compare byte-for-byte equal to SEEDS `d6de39aa`; the six pocket files are also unchanged from this project's pre-update baseline.
- No package or lockfile change in this compatibility update. **Current `bun audit` reports 24 advisory entries across 8 package names: 13 high, 10 moderate, 1 low.** This supersedes the earlier “3 warnings” summary; counts from different scans must not be conflated. Full raw output is included. No dependency vulnerability is claimed repaired by this update, and scan counts alone do not establish published exploitability.

## Not verified / release blockers

- **No complete real SEEDS session was exercised or claimed verified.** The cross-project checkout is source only and carries no usable source-project session or database access. Mock response tests are not an end-to-end production sign-in test.
- Real MetaMask, Rabby, Coinbase Wallet and Phantom requests and look-alike-host warnings require independent wallet-device checks on the intended live host before launch.
- Physical coin camera/QR scan remains untested in this round. Coin derivation vectors and scan-gating behaviour pass, but these do not substitute for a real scan.
- A real manifest naming `key.seeds.honest.money` correctly fails on localhost, the published alias or the editor-preview host. Do not loosen this binding merely to test. Coordinate a genuine same-host request/test deployment or test the release on its permanent host without announcing availability.
- H1/H2/M4 are **not declared closed by this Key update**. Re-audit both projects' combined protocol, starting-browser secret, “is that you?” confirmation, held-key notifications/approval, replay/concurrency handling, wallet warning behaviour and fixed-signature recovery risks.
- Guide K4's static-only hosting conflicts with this project's mandated TanStack Start stack. Static-only delivery, built-file SHA-256/About publication and SRI are **not implemented**. Existing request-specific CSP nonces and SSR are preserved; no claim of full guide/K1–K8 compliance is made. Decide the supported reproducible delivery approach before clearance.
- No hosting headers, injected scripts, cache behaviour or wallet popups on the actual published host were reverified. Prior strict header architecture is unchanged and regression-tested.
- WalletConnect and generic Wallet Standard wallet discovery remain outside this update, as before.

## Auditor packet requirements

The packet contains clean source without repository metadata/dependencies/build output or environment files; it explicitly includes `src/routeTree.gen.ts`, the lockfile, new tests, current source commit, a binary-capable change patch including new files, source SHA-256 inventory, reference equality evidence, SEEDS guide and requested catch-up note, raw tests/dependency output and browser evidence.

Review `PACKET-README.md` first. Request source and SEEDS-side protocol review together; do not approve publication solely because unit/mock checks pass.