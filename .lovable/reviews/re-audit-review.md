# Seeds Key — our review of the independent re-audit

**Reviewed:** November 21, 2026
**Decision:** No application changes or publication have been made. The re-audit's tidy-up suggestions are optional and await Bobby's choice.

## Bottom line for Bobby

The independent auditor re-checked our November 21 repairs and confirmed them: the fixes we said we made are really there, the tests really pass, and the locked-down protections behave as described on a running server. The auditor agrees with our decision that the page is **not ready to publish**, because the two high-risk problems (wallet-signature phishing and forwarded-link sign-in theft) are untouched by design and need work in the SEEDS project.

Nothing in the re-audit contradicts our earlier review, and nothing in it forces a change to this app.

## What the re-audit confirms

- M1 (fake branding/return links), M2 (live page trusting the SEEDS editing preview) and the approved part of M3 (page protections) are **closed** and independently verified: per-request script nonces, no inline-script allowance, full headers on error pages and unknown hosts.
- L4 (input checks) is **closed**; L1 is **partially closed** — exactly one package changed (seroval 1.6.8 → 1.6.12), 25 advisories remain, all in build/development tooling that never ships in the sign-in code.
- The reference cryptography files are byte-identical to before, and the original pocket test vectors still pass. No wallet addresses changed.
- H1, H2 and M4 remain **open**, as we already held them.

## Packet-quality problems the auditor found (not security issues)

1. Our auditor packet was missing the generated route-tree file, so the shipped source failed one test file and the typecheck until a build regenerated it. After regeneration: 39/39 tests pass, typecheck clean, production build succeeds.
2. The tracked-changes patch omitted the six new files.
3. The "unchanged reference files" evidence file was empty; the auditor verified by hash instead.

**Impact:** none on the app itself. **Fix:** future auditor packets should include the generated file (or document the regeneration step), include new files in the patch, and list file hashes as evidence.

## The auditor's tidy-up suggestions, and what each could break

None are vulnerabilities. Our assessment of each:

1. **SEEDS-side contract test for the manifest format.** Our tightened checks mean a SEEDS format change would fail sign-in closed. Agree in principle; this is SEEDS-project work, not a change here. No risk to this app.
2. **Pass the nonce through the handler's `context` option instead of a header.** Cleaner, removes the request reconstruction. Low risk, but touches the exact mechanism the auditor just verified live; only worth doing with the full nonce test suite re-run. Optional.
3. **`env`/`ctx` no longer forwarded to the handler.** Nothing uses them today; only matters if server code ever needs Cloudflare bindings. No action needed now.
4. **Make `localhost:8080` preview trust dev-only.** Harmless today (an attacker cannot make a victim's browser report that origin for the live site), but trivially safe to gate behind dev mode. Low risk; small code change plus test updates.
5. **Give designated previews a relaxed CSP instead of none.** Would harden previews, but risks breaking the editor's injected scripts and framing — the exact thing the exemption exists for. Hold unless tested against the editor.
6. **Expiry format note.** Covered by item 1; no separate action.
7. **Seeds error text shown verbatim.** Rendered as plain text, not an injection path; acceptable for a trusted origin. No action.
8. **Remove `zod` and the unused shadcn UI set.** Shrinks the advisory count, but edits the lockfile — the thing the auditor just verified has exactly one change. If done, it needs a fresh lockfile diff in the next packet. Optional housekeeping.

## On the auditor's response to our pushback

- The auditor conceded our three points: SIWE requires a nonce and issued-at (their "no nonce" suggestion is now "investigate, not adopt"), "no XSS protection at all" was overstated, and signature/derivation changes do alter pocket addresses. Our review stands as written.

## What still gates publication (unchanged)

1. H2: SEEDS must deliver the session only to the browser that completes on Key, with a deliberately designed desktop authorisation step.
2. H1: a domain-checked signing method verified on MetaMask, Rabby and Phantom, or a decision to launch without outside-wallet sign-in.
3. M4: a versioned migration design before any signature-handling change.
4. After any future publish: confirm live headers, hosting-injected scripts, and cache behaviour on the real host.
5. HSTS once the host inventory is confirmed; opener isolation only after wallet-popup testing.

## Proposed approval boundary

**Safe to do now (optional, low risk):** gate localhost preview trust behind dev mode; remove unused dependencies with a fresh lockfile diff recorded.

**Hold:** nonce-transport refactor and preview CSP until the next repair round, so this verified state stays intact for the record; SEEDS-side contract test belongs in the SEEDS project.

**Still blocked:** H1, H2, M4, and publication.
