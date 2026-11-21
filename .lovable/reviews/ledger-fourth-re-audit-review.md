# Fourth Ledger re-audit — Key review and proposed response

Date: 2026-11-21 UTC. Reviewed source: `0d1d102`, with audit baseline `7014e33`.

## Decision

**Keep publication on HOLD. No application changes applied.** The audit supports the careful adapter implementation but does not establish safe launch, physical-device compatibility, or the deployed loading correction.

The uploaded `SEEDS-Key-Ledger-Re-Audit.md` and its accompanying summary cover the original Ledger packet at `7014e33` (70 tests), **not** the later loading-repair supplement at `0d1d102` (72 tests). This distinction matters: the auditor inspected lazy chunks but could not serve production HTML; the published site nevertheless shipped empty Buffer/events replacements and failed before device connection. The subsequent alias-resolution repair still needs independent review, compiled-asset inspection and an approved deployed-host check. This audit must not be treated as approval of that repair or proof the live error is fixed.

## Findings and impact

| Audit item | Key assessment | Recommended action / impact |
|---|---|---|
| Direct Ledger has no browser-wallet origin enforcement | Agree. The permanent host is included in signed text, but Ledger cannot authenticate the requesting site. A fake site can request the same text. The warning is not a cryptographic fix. | Keep launch held; coordinate protocol decisions with SEEDS. Changing the message or derivation could strand existing pockets and is not approved. |
| Account-path recovery | Agree. Different paths select different Ethereum keys and thus different Seeds identities/pockets. | Add a clear same-path-next-time notice without changing the default path or persisting the selection. |
| Address before signing | Already partly implemented: `getAddress(path, true, false)` requires device confirmation; `walletSignIn` calls `onIdentity(shortKeyName(...))` before signature one. The signer is shown above the wallet section, not beside the path, and there is no separate page confirmation pause. | Place the existing short signer beside the selected path if approved. Do not claim a guaranteed browser repaint or a separate pre-signature review step. |
| `AbortSignal.any` support | Agree, with an additional consequence: the call occurs after a device session opens but before the cleanup `try/finally`. If it is missing, the error can bypass closing the session and removing the disconnect listener. Listener registration is also before the protected cleanup block. | Add a small compatible cancellation combiner and protect post-open setup with cleanup; test missing native support, cancellation, disconnect and setup failure. Preserve late-signature submission prevention. No signing-byte changes needed. |
| Direct Ledger versus MetaMask signature equivalence | The formatter accepts only 27/28 and the public guide vector matches. This establishes serialization, not physical-device equality. Same-key, byte-identical, repeatable signatures yield the same pocket; same-key hardware equivalence remains unverified. | Compare direct and MetaMask signing on physical devices before launch. Do not present this audit's vector check as completed hardware verification. |
| Bluetooth transient activation | Agree; preload exists but SDK awaits need real-device testing. | Keep USB/Bluetooth picker activation on the physical-device release checklist. |
| Global Buffer/global setup | Accurate; `prepareLedger` installs both after Continue. | Document this existing behavior in AGENTS.md if approved; no additional globals or external scripts. |
| Deprecated transports | Agree with the reported maintenance concern. Replacing transports is a substantive implementation and verification task. | Plan and separately approve migration to official maintained Ledger tooling before launch. Do not switch libraries or hand-roll APDU signing during a small repair. |
| Ethers/axios/elliptic footprint | The used personal-sign path does not deliberately invoke HTTP metadata or elliptic signature verification. This is not proof the entire ethers library is unused or every dependency is unreachable. | Retain the documented advisory. Treat the audit's 25-advisory total as its dated result, not a fresh scan. Avoid untested dependency removal. |
| Welcome-page copy | The two strings were separately requested by Bobby and committed before the Ledger implementation; they appeared because the packet baseline covered those earlier edits. | Do not undo, capitalize, or otherwise change approved copy. Future packets should identify unrelated included commits clearly. |
| Clock tolerance and SIWS fields | Audit agrees with approved 60-second future-issued tolerance, strict expiry and exact parser-field coverage. | No further changes proposed. |

## Unresolved release gates

- H2: forwarded-link session delivery must be repaired in SEEDS; matching codes and held-key confirmation do not close it.
- H1: Solana and direct Ledger phishing remain open; browser EVM still requires real wallet-origin checks.
- M4: cross-provider recovery-byte compatibility requires a shared SEEDS decision and member-history evidence before changes.
- Independent review of the latest Ledger loading-repair supplement and inspection of real compiled/deployed assets.
- Physical Ledger tests: Nano S Plus, Nano X and Stax/Flex; applicable USB/Bluetooth combinations, current and previous Ethereum-app versions, device message/address display, picker activation and repeatable direct-versus-MetaMask signatures. These are proposed checks, not verified supported combinations.
- Complete live SEEDS confirmation on `key.seeds.honest.money`, physical coin scan and deployed header/cache/injected-script review.
- K4 public delivery/hash work remains unimplemented and needs separate release approval.

## Proposed limited approval

Approve only the same-path recovery notice, adjacent existing signer display, older-browser cancellation/cleanup repair with focused tests, and documentation of installed browser globals. These do not alter pocket messages, signature bytes, default account paths, host trust or SEEDS session delivery. Hold transport migration, wallet/protocol changes and publication.

## Current verification

Re-ran `bunx vitest run`: **72/72 tests passed across 10 files**. This includes production configuration alias resolution, not a fresh production build or deployed-asset proof. No physical Ledger, live member sign-in or newly deployed loading correction was verified in this review. No fresh dependency scan was performed. Only this review and roadmap were changed.

Auditor inputs for the next round: the original Ledger packet plus `seeds-key-ledger-loading-audit-supplement.zip`, this review, and any separately approved limited-repair packet.