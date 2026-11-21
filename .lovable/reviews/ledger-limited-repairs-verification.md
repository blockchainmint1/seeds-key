# Approved limited Ledger repairs — verification and auditor handoff

Date: 2026-11-21 UTC. Baseline: `cbca716` (fourth-audit review), incorporating loading repair `0d1d102`.

## Approved scope delivered

- Ledger account-path recovery reminder: use the same Ethereum account path each time; changing it opens a different Seeds pocket. The default remains `m/44'/60'/0'/0/0`; selection is not stored.
- The existing short signer identity is also displayed beside the account path after device address confirmation. It is cleared on a new connection attempt or path edit. Parent signer display remains unchanged.
- Caller cancellation and device disconnect now feed a local AbortController without requiring `AbortSignal.any`. Caller abort reasons and disconnect error wording are retained.
- Post-picker listener setup is inside protected cleanup. A setup failure still closes the session; an unsubscribe failure cannot skip transport closure. Cancellation during the picker closes a subsequently returned session before any address or signing request.
- AGENTS.md documents existing post-Continue Buffer/global setup and the cancellation/cleanup rule.

No new wallet flow, separate page confirmation pause, automatic account selection, persistent path storage or transport migration was introduced.

## Unchanged sensitive behavior

- No edits to copied SEEDS pocket modules or key-signin reference files.
- No edits to wallet pocket messages, derivation, signature serialization, recovery-byte handling, default path, manifest trust, expiry/clock rules, CSP or server/session delivery.
- Existing Ledger SDKs, package versions, lockfile and browser alias repair remain unchanged.
- Device address confirmation and the three-signature EVM flow are reused unchanged. Short account visibility is not an origin-authentication control or a guarantee of device compatibility.
- No publication performed. The live loading error is not claimed corrected by these local repairs.

## Verification

### Automated tests

`bunx vitest run`: **78/78 tests passed across 10 files** (72 existing plus six new Ledger regressions).

New regressions cover:

1. Three-signature completion and held result without native `AbortSignal.any`.
2. Caller cancellation without native `AbortSignal.any`: late signature cannot POST; transport and listeners cleaned up.
3. Device disconnect without native `AbortSignal.any`: late signature cannot POST; transport and listeners cleaned up.
4. Disconnect-listener setup failure closes an opened transport and removes the caller listener.
5. Disconnect-listener cleanup failure cannot bypass transport closure.
6. Cancellation while the device picker is pending closes its returned session without requesting an address or submitting.

Existing tests still cover exact guide signatures, default and alternate Ethereum paths, strict request expiry, invalid requests, nonrepeatable signatures and production configuration alias resolution. Configuration resolution is not a compiled production-asset check.

Platform build signal: **build OK**, timestamp `2026-11-21T21:05:18Z`. No manual build/typecheck run. Existing Vite configuration warnings appeared during tests; no test failed. No fresh dependency vulnerability scan was performed.

### Browser checks

Playwright against `http://localhost:8080`:

- Desktop 1280 × 1800, simulated USB; mobile 393 × 852, simulated Bluetooth.
- Continue gate followed by a valid, host-bound synthetic request; `AbortSignal.any` disabled before Ledger preparation.
- Device address confirmation requested on unchanged default path. First simulated signature deliberately paused so the adjacent account, recovery notice and disabled path could be inspected.
- Three signatures completed, one sealed mock POST per flow, held result displayed as **Confirm on Seeds**, transport closed once and disconnect listener removed once.
- Cancellation during delayed signing prevented a late POST; only the first signature was requested. Changing the path afterward cleared the adjacent identity.
- No browser page errors or horizontal overflow. Desktop/mobile Ledger sections, cancelled path edit and mobile held result screenshots visually inspected; text fits and controls do not overlap.

**Limit:** Ledger SDK/device signing and SEEDS endpoints were mocked. No physical device, actual member account, complete live SEEDS sign-in, Bluetooth permission picker or live deployment was verified. This verifies the requested local page/cancellation behavior, not release readiness.

## Remaining release blockers

Independent audit of the loading repair and these follow-ups; compiled/deployed asset checks; physical Ledger USB/Bluetooth model/firmware/app-version and signature-equivalence checks; browser-wallet origin warnings; Solana and direct Ledger phishing (H1); SEEDS forwarded-link session delivery (H2); shared cross-provider recovery-byte decision (M4); physical coin and complete live SEEDS confirmation; deployed headers/cache/injected-script review; separately approved public delivery/hash work (K4). Ledger transport replacement remains held for separate approval and testing.

## Packet contents

The supplement contains current source/configuration and self-hosted public assets, including the generated route tree when present; full changed files; a binary-capable patch against `cbca716`; source SHA-256 inventory; regression output; the browser reproduction script/results; inspected screenshots; the fourth-audit review and this report. Repository metadata, dependency directories, generated build output, environment files and session credentials are excluded. No browser signatures or sealed payloads are logged in browser results.