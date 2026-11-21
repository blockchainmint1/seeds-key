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
- No third-party scripts, fonts or analytics; the server overwrites an internal nonce header and the isomorphic router factory reads it before SSR script initialization, while shared header helpers cover normal and error responses without preventing designated editor previews.
- The live host `key.seeds.honest.money` must never change: wallet pockets are derived from it.
- Brand fonts are self-hosted in public/fonts, never loaded from Google Fonts: the strict CSP and no-third-party rule forbid external font hosts.
