# Ledger 0x650e recovery guidance — narrow audit note

Date: 2026-11-21 UTC. Baseline: `249a152`.

## Request and change

Bobby supplied a screenshot showing `Ledger device: UNKNOWN_ERROR (0x650e)` and requested guidance to open the Ethereum app.

The shared `explainLedgerError` function in `src/lib/seeds-key/ledger.ts` now adds exactly one status-specific branch, immediately after the existing cancellation branch:

```ts
if (code === 0x650e) return "Unlock Ledger and open its Ethereum app, then try again. If the app is already open, close and reopen it. (Ledger error 0x650e.)";
```

This provides a recovery step, **not a confirmed diagnosis** that this device's Ethereum app was closed. The installed Ledger error definitions did not document 0x650e, and the external lookup did not establish an authoritative meaning. The original code remains visible for further diagnosis. No unknown-status catch-all or error-message parsing was added.

USB and Bluetooth use this same formatter. Existing cancellation, known app/PIN errors, permission errors and unknown-error fallback remain unchanged. No new connection attempts, app launch commands, signing, derivation, recovery-byte handling, request validation, dependencies or server behavior changed. No publication performed; the live device problem is not claimed fixed.

## Verification

- Reproduced the exact original raw error in the running preview before editing, using a simulated Ledger `TransportStatusError` with numeric `statusCode: 0x650e` thrown at address confirmation.
- Repeated the same USB desktop flow (1280 × 1800) and Bluetooth mobile flow (393 × 852) after editing. Both show the Ethereum-app instruction and retain 0x650e instead of UNKNOWN_ERROR.
- Both failures close the transport once, remove the disconnect listener once, request zero signatures and send zero POSTs. No browser page errors or horizontal overflow. Both updated screenshots were visually inspected; text and buttons fit without overlap.
- `bunx vitest run`: **78/78 tests passed across 10 files**. No unit assertion of display copy added; the before/after browser reproduction verifies the requested message.
- Automatic platform build signal: **build OK**, `2026-11-21T21:08:57Z`; no manual application build/typecheck.
- All content-route metadata checked; unchanged.

Reproduction evidence is under `/tmp/browser/ledger-app-error/`: `check_error.py`, before/after results and USB/Bluetooth screenshots. These are temporary local evidence, not physical-device verification. The SDK/device and SEEDS manifest were simulated; the screenshot's actual physical-device state and deployed-site correction remain unverified.

## Remaining holds

Existing independent audit, physical Ledger tests, compiled/deployed asset checks and complete live SEEDS confirmation are still required. Direct Ledger/Solana phishing, SEEDS forwarded-link session delivery, cross-provider recovery-byte decisions and delivery/hash work remain open as recorded in the prior auditor packets. This message-only change closes none of those findings.