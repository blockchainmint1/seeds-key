# Ledger live-site loading failure — diagnosis and repair

Date: 2026-11-21 UTC. Publication: **not performed**. Live correction remains unverified until an approved deployment is independently checked.

## Reproduced signal

Bobby confirmed the error appears directly at `https://key.seeds.honest.money`. A fresh browser run against that host, using an intercepted synthetic SEEDS manifest bound to the permanent host, reproduced “Couldn't load Ledger support. Try again.” after Continue. No device was connected, signature requested or submit endpoint called.

The live HTML advertises source commit `7014e3336931b2707308ee5f513ae1dacdfde551`. Its `routes-CL8tA3wt.js` imports Buffer from `__vite-browser-external-BbTE95wW.js`, rather than a browser Buffer implementation. `Eth-DtRhpRM7.js` also references that empty module; `TransportWebHID-C0e6npYp.js` receives its EventEmitter through the same empty replacement. This is a published packaging defect, not a Ledger PIN, account path or firmware diagnosis.

Resolving the existing configuration in production mode reproduced the reason: Nitro's later aliases map `buffer/index.js` and Buffer/events imports to Node built-ins before our browser aliases. Vite then externalises them for client assets. Preview optimised dependencies had masked this issue. Earlier “build OK” and browser mock checks did not establish published SDK loading correctness.

## Scope of repair

- Added a small browser-alias helper with exact Buffer/events and explicit-subpath matching.
- The Ledger Vite plugin restores browser aliases in a post `configResolved` hook after Nitro merges its Node aliases, for both global and client resolution. Does not add broad Node polyfills, runtime external dependencies, third-party scripts or loosen CSP.
- No package, lockfile, wallet-pocket text, derivation, signature, recovery-byte, sign-in, manifest or SEEDS server changes.
- Tests assert concrete replacements for all relevant import forms, absence of unrelated matches and the final production client/global resolution after all plugin hooks.

## Checks and limits

- **72/72 tests passed across 10 files**, including the actual production `resolveConfig` regression (configuration resolution only, not a production build).
- Manual production configuration resolution confirms Buffer, `buffer/index.js`, events and `node:events` resolve to real npm browser files in global and client settings. Full output included.
- Automatic platform build/typecheck signal is build OK; no manual application build run. Final compiled artifacts are not available here for byte-level verification, and no new deployed-host validation is claimed.
- Browser preview rerun: real bundled Ledger SDKs load, USB/Bluetooth simulated picker cancellation does not POST, no page errors, controls fit desktop/mobile; existing complete simulated device/signing flow and cryptographic unit checks remain in the prior Ledger packet. No physical hardware verification.
- Leaf metadata was checked in the prior immediately preceding Ledger task and is unchanged here.
- Live deployment still contains the defect until an approved release replaces it. Do not call the live device error fixed solely because configuration/tests pass.

## Additional published-host signals, not repaired in this scope

The inspected response has `referrer-policy: strict-origin-when-cross-origin`, whereas application source asks for `no-referrer`. HTML includes an injected script marked `data-autocapture="1"` / `data-consent="1"` with deployment context. That is a separate hosting/no-third-party-policy review item; no execution or data collection was established here, and the script's full context token is not included in this packet. Published-host header/injected-script verification remains a release blocker. Do not automatically loosen page protections to make injected scripts run.

## Multi-chain clarification

Ledger authenticates through its Ethereum app, but the signature is used to derive the separate Seeds trading pocket with all 16 key families in the copied SEEDS reference. This is not importing Ledger's existing accounts or keeping every trade signed on hardware. Several families remain marked planned for SEEDS sending. Live market readiness was not verified. H1/H2/M4, deprecated Ledger transports and the previous runtime elliptic advisory remain unresolved.

## Auditor handoff

Review this narrow repair alongside `seeds-key-ledger-auditor-packet.zip` from the previous task. The supplement contains complete changed source files, a binary-capable patch against 7014e33, regression results, configuration-resolution output, reproduction script and screenshot. No environment files, tokens, raw live HTML, repository metadata, dependencies or generated build output. A new deployment requires independent audit and existing release-gate approval, followed by actual published-asset and device checks.