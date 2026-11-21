# Seeds Key — fifth-round repairs verification (strict-dynamic CSP, referrer meta, built-output guard)

**Date:** 2026-11-21 · **Basis:** `SEEDS-Key-Ledger-Supplement-Re-Audit.md` (fifth audit round) · **Approval:** Bobby approved all three repairs and decided to keep the site live and public on 2026-11-21.

## What changed

1. **Stricter script policy** — `src/lib/seeds-key/security-headers.ts`: `script-src 'self' 'nonce-…'` → `script-src 'nonce-…' 'strict-dynamic' 'self'`. Browsers with strict-dynamic support ignore `'self'`, so the hosting-injected un-nonced analytics tag (`/__l5e/events…js`) is blocked, while our nonced entry script and everything it imports — including the lazily loaded Ledger chunks — keep working. `'self'` remains as the fallback for older browsers. Known editor previews remain exempt from the policy, so the editor is unaffected.
2. **Referrer meta tag** — `src/routes/__root.tsx` head: `<meta name="referrer" content="no-referrer">`. The hosting edge rewrites the `Referrer-Policy` header; the meta tag is applied by the browser after headers and survives the rewrite.
3. **Built-output guard** — `scripts/check-built-assets.mjs` (new): builds, then fails if any client asset references the `__vite-browser-external` stub, if the Ledger SDK chunk is missing, or if any asset statically imports it. Documented in AGENTS.md as a standing release step, with the auditor's note that bumping `nitro`, `vite` or `@lovable.dev/vite-tanstack-config` requires re-running it.

No change to wallet keys, messages, derivation, manifests, the sign-in flow, dependencies or the lockfile.

## Verification

| Check | Result |
|---|---|
| `bunx vitest run` | 10 files, **79/79 pass** (was 78; +1 header test for the injected-script case; one server test updated to the new policy string) |
| `node scripts/check-built-assets.mjs` | **OK** — 14 client assets checked, no stub references, Ledger chunk dynamic-only |
| Preview browser check (1280×1800) | Page renders, h1 intact, `meta[name=referrer]` = `no-referrer` present in the document head, zero console errors |
| Build log | build OK |

## Live-host items for the next release check (standing, per the audit)

After the next publish, verify on the live host: the `/__l5e/events` script is blocked by the policy, the app and Ledger chunks still load, and the served headers/meta match intent. The worker's headers are not what members receive — the edge rewrites them.

## Decisions recorded

- Site stays **live and public** (Bobby, 2026-11-21). The open H1/H2 items are therefore live risks, tracked as such.
- Remaining Bobby actions: switch off visitor analytics / click tracking in project settings (the platform toggle; the CSP now blocks the script regardless), and confirm whether production SEEDS links members to Key.
- Unchanged holds: H2 session delivery (SEEDS-side), Solana and direct-Ledger H1 launch decisions, M4 byte canonicalisation, physical Ledger matrix, physical coin scan, complete live SEEDS confirmation, K4 hash publication.
