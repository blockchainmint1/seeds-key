# Seeds Key — review of the fifth audit round (Ledger supplement re-audit)

**Date:** 2026-11-21 · **Input:** `SEEDS-Key-Ledger-Supplement-Re-Audit.md` (auditor) · **Baseline reviewed:** commit `249a152` (limited repairs), live host serving `0d1d102` · **Prepared by:** the Seeds Key team, for Bobby's approval before any change is applied.

Per our standing rule, this review evaluates the audit before acting on it. Nothing in the application has been changed as a result of this audit yet.

## What the audit says, in plain terms

1. **Our two Ledger repairs are confirmed correct.** The auditor verified at the compiled-asset level what we could not: the broken v4 build shipped an empty stand-in for the Buffer/EventEmitter libraries, the repaired build bundles the real ones, and the live site now serves the repaired shape. The auditor explicitly owns having missed the stub in round four. 78/78 tests, clean typecheck, clean build, dependency advisory count unchanged at 25.
2. **The publication hold is not actually in effect.** Every packet says "publication not performed", yet the live host served the first Ledger build and now serves the loading repair. The auditor asks who published, and whether production SEEDS currently links members to Key.
3. **The hosting layer injects an analytics script that our page protections allow.** A same-origin script (`/__l5e/events…js`) with click/error autocapture runs because our policy permits same-origin scripts. Session replay exists in it but is off and its recorder 404s today. The edge also overrides our `Referrer-Policy: no-referrer` header. The auditor recommends a stricter script policy (`strict-dynamic`), a `no-referrer` meta tag, and asking the platform to disable autocapture.
4. **Recommended addition:** a built-output guard that fails if any shipped client file references the empty stub again, since the existing test proves configuration, not emitted output.

## Our independent verification of the live-host claims

We checked both claims against platform state rather than taking the audit at face value:

- **Publication:** confirmed. The project is published, visibility **public**, last published **2026-11-21 21:15 UTC** — minutes before Bobby's successful live Ledger test. His test worked *because* the repair is live. The "publication held" wording in our packets describes intent, not reality: every recent commit has reached the live host.
- **Injected script:** confirmed. Visitor analytics and click tracking are both **enabled** at the platform level for this project; that is the `/__l5e/events` script the auditor found. This directly conflicts with our Privacy page and README promise of no trackers, and with the project's no-third-party-scripts rule.

## Assessment of each recommendation

| # | Audit recommendation | Our assessment | Impact if applied |
|---|---|---|---|
| 1 | `script-src 'nonce-…' 'strict-dynamic' 'self'` | **Sound, adopt.** Our own entry script carries the per-request nonce; `strict-dynamic` extends trust to everything it imports, including the lazily loaded Ledger chunks. The un-nonced injected analytics tag is then blocked by browsers that understand `strict-dynamic`; older browsers fall back to `'self'`. Editor previews are unaffected — known previews already skip the policy entirely so the editor's own tooling keeps working. | Blocks the platform's injected analytics on the live host even if the platform toggle stays on. Must be verified on the live host after release: app loads, Ledger chunks load, injected script blocked. |
| 2 | `<meta name="referrer" content="no-referrer">` in the document head | **Sound, adopt.** The edge rewrites the header; a meta tag is applied by the browser after headers and survives the rewrite. Trivial and low-risk. | Restores the intended no-referrer behaviour on the live host. |
| 3 | Ask the platform to disable autocapture for this project | **Sound, but it is Bobby's action.** The analytics/click-tracking toggle lives in project settings and is not available to the team's tools. The stricter script policy (item 1) blocks the script regardless, but the toggle should also be off so the promise and the setting agree. | Platform stops injecting the script at all; defense in depth alongside item 1. |
| 4 | Built-output guard (fail if any client asset references the empty stub, or if the Ledger SDK chunk is statically imported) | **Sound, adopt as a release-gate script.** The current resolve-config test proves aliases are registered, not that emitted chunks are correct — exactly the gap that let v4 ship broken. A full build inside the unit-test suite is too slow, so we will add a standalone guard script that builds and inspects `assets/*.js`, run it before every auditor packet, and document it in AGENTS.md together with the auditor's note that bumping `nitro` or `@lovable.dev/vite-tanstack-config` requires re-running it. | Catches the next bundler regression before an auditor does. |
| 5 | Establish who published, and whether SEEDS links to Key | **Process finding, needs Bobby.** The publish at 21:15 UTC coincides with his live test, so the likely answer is that the team published to verify the repair — but that means the "held" status ended without a recorded decision. Whether production SEEDS points members at Key (its `SEEDS_KEY_URL` secret) can only be confirmed on the SEEDS side. | Determines whether the open H1/H2 risks are theoretical or live today. |

## What we recommend doing now (pending Bobby's approval)

1. Adopt the stricter script policy (`strict-dynamic`) with tests covering: nonce preserved, `strict-dynamic` present, `'self'` retained as fallback, preview exemption unchanged.
2. Add the `no-referrer` meta tag to the root document head.
3. Add the built-output guard script and the AGENTS.md release-gate note; run it once against the current build.
4. Re-run the full suite and a browser check, then prepare a short auditor supplement.

None of these touches wallet keys, messages, derivation, manifests or the sign-in flow.

## What stays held

- **Publish-state decision.** The site is live and public right now. Options: leave it public (accepts that open H1/H2 items are reachable), switch visibility to private (login-gated; the team can do this with approval), or unpublish (Bobby's action). This needs Bobby's explicit decision — see the open question.
- **Analytics toggle.** Bobby switches off visitor analytics / click tracking in project settings.
- **SEEDS-side link check.** Confirm whether production SEEDS currently links or redirects members to Key.
- **Unchanged from prior rounds:** H2 session delivery (SEEDS-side), Solana and direct-Ledger H1 launch decisions, M4 byte canonicalisation, physical Ledger matrix, physical coin scan, complete live SEEDS confirmation, K4 hash publication.

## Risk note on the stricter script policy

If the hosting platform ever injects a script the app *depends* on, `strict-dynamic` would block it too. Today nothing the app needs arrives that way — the app is fully self-hosted by design — so the direction of the trade-off is correct for a page that handles key material: nothing runs that we did not ship.
