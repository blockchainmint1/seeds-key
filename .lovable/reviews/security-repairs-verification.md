# Seeds Key — approved security repairs and auditor handoff

**Date:** November 21, 2026  
**Approval:** Bobby approved the safer repairs, holding wallet derivation changes and publication.  
**Release status:** NOT approved for publication. H1/H2 and the wallet-recovery design remain unresolved.

## Implemented

### Manifest trust and validation (M1, M2, relevant L4)

- Production Key, its published alias and unknown hosts accept only `https://seeds.honest.money`.
- Only the exact designated Key preview and `http://localhost:8080` additionally accept the exact SEEDS preview origin.
- Manifest reads require the exact `/api/public/key-signin/manifest/<32 lowercase hex ID>` path, HTTPS allowed origin, no URL credentials, query or fragment. Redirects fail rather than following to another host.
- Submission requires the literal same-origin `/api/public/key-signin/submit` address, without query or alternate endpoint. POSTs also refuse redirects and omit credentials.
- The signed domain must match the verified request host. The challenge ID must match its URL; the challenge is 48 lowercase hex characters. The recipient must decode to a nonzero 32-byte public key in the current protocol's unpadded base64url format.
- The displayed name and return origin are generated from the verified request URL, never the manifest's claimed `app_name` or `origin`. Preview requests visibly say `Seeds Exchange (preview)`.
- Expiry must parse as a future timestamp. Pockets must be integer accounts **1106–2105**, not savings account zero. Wallet kinds, when provided, must be supported kinds.
- Expiry and trust are checked before key derivation/provider connection and again before POST after signature approval. Retry accounts and success responses are validated without coercing strings into account numbers. Retries remain capped at five.
- Manifest fetching is cancelled when the request changes. Camera startup handles missing canvas/video and stops a late-arriving stream after cleanup.
- Successful returns preserve `kind=wallet` versus `kind=coin` on the verified Seeds origin.

### Page protections (selected M3)

- The server creates a fresh **128-bit script nonce per request**, overwrites any inbound internal nonce header, and reconstructs the request using standard fields while retaining method, body and cancellation signal.
- The router's isomorphic factory reads that internal header on the server before hydration-script initialization. The browser branch never reads server request utilities. There is no module-global per-request nonce state.
- Strict hosts use `script-src 'self' 'nonce-…'` with **no script `unsafe-inline`**. All four observed SSR startup/scroll/stream scripts carry the same request nonce.
- Added `base-uri 'none'`, `form-action 'self'`, `object-src 'none'`, `frame-src 'none'`, `worker-src 'self'`, explicit self-hosted fonts, and HTTPS upgrades. Connection sources mirror production-only trust on strict hosts.
- Retained inline styles for compatibility, camera permissions, self-hosted imagery and no-referrer policy. Added legacy frame denial and applied protections to regular, thrown-error and swallowed-SSR-error responses.
- The published lovable.app alias now receives strict protections too. Exact designated previews remain exempt from strict CSP/frame denial so editor injection and framing still work; basic privacy, MIME and camera headers remain present there.
- HTML is `Cache-Control: no-store` to avoid reuse of request-bound startup nonces and sign-in pages. The fallback error retry is a normal same-page link, not an inline event handler that CSP would block.
- No redirects, opener-isolation header, HSTS/preload commitment or shared-domain cookies were introduced.

### Targeted dependency repair (L1)

- Overrode `seroval` **1.6.8 → 1.6.12**, a patch release older than the existing 24-hour installation guard. Both cited serializer advisories are absent from the fresh audit.
- Lockfile inspection confirms this is the **only package-version change**. No blanket upgrades or cryptography version changes were made.
- Dependency audit now reports **25 advisories: 14 high, 10 moderate, 1 low**, down from 27. Remaining advisories are included as raw output in this packet; they are not silently ignored or represented as fixed.

## Preserved intentionally

- No edits to `src/lib/pockets/*`, `src/lib/key-signin/rules.ts`, or `src/lib/key-signin/seeds-key-reference.ts`; those remain verbatim SEEDS reference copies.
- No changes to fixed wallet message text, signature normalization, HKDF, derivation paths, key sealing format, or the live host. The existing identity, pocket-address and wallet-phrase test vectors still pass.
- No recovery phrase display/storage/logging/sending feature was added. The small flow changes add validation and missing-provider guards; temporary wallet signature bytes are also cleared in `finally`.
- No SEEDS project, database, session-claim protocol, auth settings, or deployed site was changed.

## Verification completed

### Automated: 39/39 passing

All six test files pass via `bunx vitest run`:

- Original cryptographic vectors and route check: 7 tests.
- Manifest/deployment/response/retry security rules: 18 tests.
- CSP/header behavior: 7 tests.
- Server nonce overwrite, concurrent POST handling and error protections: 4 tests.
- Flow entry rejection before phrase/provider work: 3 tests.

The harness's newest build entry reports **build OK**. Raw test output is included.

### SSR checks

- The local SSR response contains the normal welcome heading and all four startup scripts with a nonce.
- Four concurrent requests each used a different nonce; each response's scripts shared only that request's nonce.
- An attacker-supplied `x-seeds-key-script-nonce` header did not survive the server overwrite.
- Server tests verify CSP matches the nonce delivered to the inner handler, including error responses, and that POST bodies are preserved.

### Browser checks

The browser navigated the canonical Key origin while Playwright served the local dev responses there and imposed the matching strict script policy. This tests browser enforcement, **not the deployed site's actual headers**.

- Welcome, Terms, Privacy and Manifesto load under that strict policy.
- A deliberately added unapproved inline script is blocked.
- A synthetic Ethereum provider completes the existing three-signature flow, derives and seals all 16 key families for pocket 1106, POSTs to a mocked Seeds endpoint, and displays the success screen with the correct wallet return link.
- Spoofed `origin`/`app_name` never appear as the displayed trusted site or return link.
- Expired requests produce no wallet approvals; cross-origin submission requests never open the camera; production Key rejects a SEEDS-preview request without fetching it.
- Desktop 1280×1800 and mobile 393×852 screenshots were inspected; the mobile welcome has no horizontal overflow. Local/editor-style preview still loads.
- No page JavaScript errors were observed. Expected CSP console warnings blocked only the dev build's live-editing WebSocket to localhost, which is deliberately absent from the production connection allow-list. The injected inline-script probe was also expected to be rejected.

Screenshots and the synthetic browser script are included in the packet. It uses no real recovery phrase, wallet, account, cookie or credential.

## Not verified / still required

1. **H1 remains:** an outside website can request the fixed wallet signature used as the pocket secret. No claim is made that this release is safe against that lure.
2. **H2 remains:** SEEDS' originating browser retains the request-claim secret and obtains the victim's session after a forwarded link is approved. This was confirmed in the SEEDS read-only snapshot (`e5c18b5d`) during review, not attacked in production. SEEDS must be changed in its own project with a safe cross-device authorization design.
3. **M4 remains:** future wallet/connector signature-byte changes can impair recovery. A versioned migration and legacy-pocket recovery design are held; showing phrases is prohibited.
4. **L3 upstream buffer wiping** was not patched inside verbatim cryptography copies; any such change must first land in SEEDS and be re-copied.
5. Real wallet extensions/hardware/Phantom behavior, real camera scan and live SEEDS session redemption were **not** verified end-to-end. The synthetic browser success is not evidence of a real signed-in session.
6. Actual published Worker behavior, deployed CSP headers, custom-domain/cache configuration and hosting-injected scripts need deployment-equivalent independent checks. This task did not publish; dev browser checks cannot prove live deployment safety.
7. The remaining 25 dependency advisories need exposure review and any further compatible patch proposals. They were outside this narrowly targeted serializer repair.

## Instructions for independent re-audit

Review the supplied source and lockfile rather than the screenshots alone. Run the tests, inspect production output, exercise strict headers on canonical and published-alias hosts including 500s, and confirm all generated scripts use the matching nonce. Check production/preview rejection before any camera or wallet work, relay/domain mismatches, redirect rejection, malformed expiry/account responses and retries. Independently compare all verbatim crypto copies with SEEDS and verify legacy pocket addresses remain unchanged.

Do not approve publication until the high-risk SEEDS/session and outside-wallet design repairs are separately approved, implemented, adversarially tested and re-audited. No automatic security scan substitutes for the required third-party evaluation.