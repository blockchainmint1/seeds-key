<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Seeds Key rules
- `src/lib/pockets/*` and `src/lib/key-signin/{rules,seeds-key-reference}.ts` are verbatim copies from the SEEDS project; never edit them here, re-copy instead. tsconfig matches SEEDS' strictness so they compile unchanged.
- The recovery phrase must never be sent, stored, logged or shown; only `src/lib/seeds-key/flows.ts` touches it, in memory.
- Manifest trust uses `src/lib/seeds-key/policy.ts`: only designated Key previews may trust the SEEDS preview; all other hosts are production-only, so editing access cannot authorize live pocket handoffs.
- Validate manifests and submit responses through `src/lib/seeds-key/manifest.ts` before key work and again before POST; URL-derived identity, exact protocol endpoints, expiry and pocket bounds prevent relay and malformed-request acceptance.
- Bind manifests to the current Key host, request times and computed pairing code; mount scanning/signing controls only after Continue, and distinguish held key changes from success because SEEDS requires final confirmation.
- Prefer Phantom's native signIn with byte-exact SIWS text; discard nonmatching native signatures before an exact-text signMessage fallback, and require repeatable signatures because formatting changes strand deterministic pockets.
- No third-party scripts, fonts or analytics; the server overwrites an internal nonce header and the isomorphic router factory reads it before SSR script initialization, while shared header helpers cover normal and error responses without preventing designated editor previews.
- The live host `key.seeds.honest.money` must never change: wallet pockets are derived from it.
- Brand fonts are self-hosted in public/fonts, never loaded from Google Fonts: the strict CSP and no-third-party rule forbid external font hosts.
- Direct Ledger signing lives in seeds-key/ledger.ts and LedgerFlow; preload official SDKs only after Continue, restore Buffer/events browser aliases in a post configResolved hook after Nitro's node aliases (including explicit subpaths), and never subscribe to SDK diagnostic logs because signatures must not be exposed.
- Ledger adapters reuse the existing EVM flow without rewriting signature bytes or wallet-pocket messages; transports close on completion, failure, cancellation and unmount, and abort signals prevent pending signatures from being posted after cancellation.
- Ledger preparation installs browser `globalThis.Buffer` and `globalThis.global` after Continue; other modules must not assume these globals are absent because the official SDK depends on them.
- Combine Ledger caller cancellation and device disconnect through an AbortController, not AbortSignal.any, and protect post-picker listener setup/cleanup with transport closure so older supported browsers and setup failures cannot leak a session.
- The script policy is `script-src 'nonce-…' 'strict-dynamic' 'self'` so hosting-injected scripts without the per-request nonce (e.g. the platform analytics tag) are blocked; the root head also carries a `no-referrer` meta tag because the edge rewrites the Referrer-Policy header. The hosting layer injects scripts and rewrites headers after the worker runs, so a live header/asset check is a standing release step, not a one-off.
- Run `node scripts/check-built-assets.mjs` before every auditor packet and after any bump of `nitro`, `vite` or `@lovable.dev/vite-tanstack-config`: it builds and fails if any client asset references the `__vite-browser-external` stub or statically imports the Ledger SDK chunk.
