# Verifying Seeds Key

## Reproduction baseline

Use Bun **1.4.4**, the version used for this repair verification, and the committed `bun.lock`. Keep runtime/dependency changes separate from these security repairs.

```bash
bun --version
bun install --frozen-lockfile
bunx vitest run
node scripts/check-built-assets.mjs
```

`src/routeTree.gen.ts` is tracked and must be included in source packets. If an export omitted it, run `bun run build` before testing to regenerate it. Never edit it by hand. The built-output guard builds again when invoked, then rejects browser-external stubs and static Ledger SDK imports. Its script is a maintainer tool; it is not shipped as application server logic.

## Shared-source provenance

The always-pocket-1106 import was recorded from SEEDS snapshot **`0b048b02`** at Key commit **`bb6a0a8549681d16f358e13474470fdca119cf8b`**. The provenance identifier comes from that earlier project coordination; the re-audit repairs do not claim a fresh independent comparison with SEEDS.

```text
5c9e65dadb64301f314a7548ebc2e94e1bc8f055748341b6e358e56aac936a49  src/lib/key-signin/rules.ts
566f9022090c4e0d2193e14349717679d837eef23a632e886456e43b24450dde  src/lib/pockets/coins.ts
```

```bash
sha256sum src/lib/key-signin/rules.ts src/lib/pockets/coins.ts
```

These files and the other declared SEEDS reference modules remain verbatim copies. Obtain the recorded upstream snapshot independently for byte-for-byte comparison. Re-copy upstream files rather than editing them locally.

## Local build and live assets

After the guard passes, client assets are normally in `dist/client` (or `.output/public` with a different compatible output configuration). Record local SHA-256 checksums of every emitted client file, including lazy Ledger chunks. Auditor packets carry source `SHA256SUMS` separately from built-client checksums; a source checksum is not a deployment checksum.

Reproducible-build evidence: on 2026-11-22 an independent reviewer built from a clean checkout of the public repository and found the emitted `routes` and `index` client chunks byte-identical (same filenames and SHA-256) to the ones the live host serves. To repeat: check out the commit the live host serves, run `bun install --frozen-lockfile` and `bun run build` with the pinned Bun version, hash every emitted client file, and compare against the live-host fetch below.

At an authorized release, fetch the HTML from `https://key.seeds.honest.money` without a sign-in request. Check the delivered content security policy, referrer meta tag, script nonces and script list. Fetch same-origin `/assets/` files referenced by that HTML and by its import graph and compute SHA-256 checksums over the decoded response bodies. Compare those exact bytes with the corresponding local files, including dynamically imported chunks. Do not send cookies, session tokens or sign-in URLs to comparison tools.

Different asset names or checksums require investigation. Hosting-injected HTML, per-request nonces, build-environment differences and transformed assets mean a matching source tree alone does not prove reproducible deployment. Do not claim that these repairs have been deployed: publication is held.

## Source packaging and history

Include source, configuration, lockfile, generated routes, scripts, docs, public assets, MIT license and both font-family OFL notices. Exclude repository metadata at every depth, dependencies, build output, environment files, local caches and removed private review notes. Inspect the archive's full entry list before sharing it.

The owner's confirmed choice is to share Git history as-is. Removed review notes still exist in older commits; packaging a clean current tree does not erase history. Scan all locally available Git references with a redacted secret scanner and state its scope. Remote-only branches and provider settings are not established by a local scan. Enable provider secret/push protection and appropriate branch protections separately after checking their interaction with Lovable sync; this guide does not claim they are enabled.

## Coordinated checks

Pocket 1106 does not rotate after revocation. Vault v2 timestamps must use exact `toISOString()` form and its ordered 16-chain path list requires a coordinated version update if changed. Preview-only trust does not activate offline Vault, whose v2 protocol remains live-host-only. Refer to [the coordination checklist](hme-vault-link.md) and [SECURITY.md](../SECURITY.md) for remaining gates.
