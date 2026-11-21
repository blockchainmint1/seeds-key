# Seeds Key — review of the external security audit

**Reviewed:** November 21, 2026  
**Decision:** No application changes or publication have been made. Approval is required before repairs.

## Bottom line for Bobby

The audit is useful and its main risks are credible. Passing tests does not make this sign-in design safe against someone tricking a member.

**I recommend withholding approval for public use until the two takeover risks are addressed and independently rechecked.** This is not evidence that someone has already stolen funds.

I checked the current Key code and a read-only snapshot of SEEDS, commit `e5c18b5d`. The page's existing tests still pass **7 out of 7**. A fresh dependency check reports **27 advisories: 14 high, 12 moderate, 1 low**. These are package warnings, not 27 proven attacks against this page.

## Recommendations and what they could break

### H1 — another website can request the signature that unlocks wallet pockets

**Agree with the finding.** The wallet signs fixed text, and that signature becomes the secret for its Seeds pockets. Including our website address in the text does not stop another website from asking for exactly the same signature. This affects the outside-wallet option, not the Cold Storage Coin's phrase itself.

**Do not apply the proposed message or secret changes directly.** A different signed message, an extra derivation secret, or changed signature bytes produces different pocket addresses. Existing users could see empty new pockets while their funds remain at the old addresses.

Wallets' domain-aware sign-in messages are worth investigating, but are not a guaranteed cure. The report's suggestion to use Ethereum sign-in with “no nonce” is not a valid standard SIWE message: a nonce and issued-at field are required. Fixing fields for repeatable key derivation also removes normal freshness protection. Wallet warnings vary and must be verified on the actual supported wallets. Authentication and repeatable pocket recovery need separate consideration.

A Seeds-supplied secret is not automatically sufficient either. If anyone can retrieve it after merely connecting an address, an attacker can retrieve it too. Its release must require a genuinely protected step, and loss, rotation and backup must be designed.

**Hold:** redesign and migration until coordinated with SEEDS. An interim option is disabling outside-wallet sign-in, but that removes a promised onramp and does not fix H2 for coin users.

### H2 — a forwarded genuine link can sign in the person who sent it

**Confirmed in SEEDS source, beyond the audit's inference.** SEEDS creates a browser secret, retains it in the originating tab, polls the request, then gives that tab a sign-in token after Key submits. An attacker who started the request owns that secret. The secret blocks a stranger from claiming arbitrary requests, but does not stop the request's creator tricking a victim into approving one.

References: `startKeySignin` and `claimKeySignin` in `src/lib/key-signin/key-signin.functions.ts`, plus the polling and token redemption in `src/routes/key-signin.tsx`.

**Agree that this needs a coordinated SEEDS repair.** Giving a one-time completion result only to the browser that used Key is a promising direction, provided polling can no longer obtain a session and any completion destination is strictly validated.

**Impact:** the existing desktop-to-phone QR workflow would no longer automatically sign in the desktop. A safe way to authorize that desktop must be explicitly designed. A short code alone can still be relayed by an attacker; it is not sufficient proof of intent. A shared `.honest.money` cookie broadens trust to sibling sites, and a device fingerprint is not a dependable security boundary.

This was confirmed by source inspection, not by attacking a live account. This chat can read SEEDS but cannot modify it.

### M1 — displayed site and return address come from unverified fields

**Agree; prioritize repair.** Fix the displayed site name and return address from the allowed request address; reject a signed domain that differs from the actual Seeds host. Validate field types, expiry, pocket bounds and the actual manifest/submit paths.

**Expected impact:** legitimate production requests remain compatible; malformed or misleading requests fail before scanning or signing. Preview requests must still use their actual host. The SEEDS snapshot currently builds the signed domain from the request host, so this matches its protocol. Keep the existing Seeds Exchange identity in the displayed name.

This closes the report's preview-to-production relay route, but it does not solve H1 or forwarded production requests in H2.

### M2 — the live page trusts the SEEDS editing preview

**Agree.** The live Key page should accept only production SEEDS requests. Permit the listed SEEDS preview only on the designated Key preview/development environments, not every unknown host. Match the page's connection restrictions to that choice.

**Impact:** production Key can no longer complete preview SEEDS sign-ins. Testing must use Key's preview. Implement host checks inside browser-safe functions, not by reading `location` while loading a module.

### M3 — page protections

**Agree with hardening; disagree that all changes are cheap or harmless.** Installed TanStack types expose nonce support, so request-specific script approval is feasible in principle. It still requires proving that every startup script receives the correct nonce and the published page starts, scans and connects wallets normally.

Add missing restrictions and cover error responses carefully. The current inline-script allowance weakens protection, but the statement that it provides “no XSS protection at all” overstates matters: other restrictions still apply.

**Do not blindly redirect every other host.** That would interfere with the editor preview. A permanent redirect also needs query handling reviewed because sign-in links contain tickets and wallet pockets depend on the host.

**Hold broad headers:** opener isolation can disrupt wallet popup communications; test before adopting it. HSTS with subdomain coverage is a lasting operational commitment and should follow a verified host inventory. A `preload` header does not itself enroll a domain in the preload list. Keep the live host unchanged.

### M4 — recovery depends on exact signature bytes

**Agree with the compatibility concern.** Asking twice in one session only verifies repeatability with that wallet version; it does not guarantee future versions or different connectors return the same bytes.

**Reject showing pocket recovery words under the current project rules.** Phrases must never be displayed, stored, logged or sent. Also, normalizing existing EVM signatures before derivation can change established pocket addresses. Any versioned normalization requires old-pocket recovery and migration, not a silent update.

The current server accepts only ordinary 65-byte EVM signatures recovered to the claimed address; blanket claims that arbitrary smart-account wrappers already work here are too broad. The larger future recovery issue remains.

## Low findings

- **L1 dependencies:** agree with targeted patched versions, starting with `seroval`, followed by regression checks. Do not run a blanket latest-version upgrade or force every cryptography package to share an identical version number; compatible requirements and SEEDS' reference implementation matter. Development-tool warnings and live-runtime exposure must be distinguished.
- **L2 ticket in the address:** a fragment can reduce server-log exposure, but requires SEEDS to change generated links and Key to change reading them. It does not hide the ticket from browser history and does not solve forwarded-link phishing.
- **L3 memory cleanup:** worthwhile best-effort improvement, not guaranteed erasure of JavaScript strings. Some proposed changes touch verbatim SEEDS reference files: fix upstream and re-copy, never independently edit those copies here.
- **L4 input validation:** agree with pocket bounds, proper types and expiry checks. Preserve server enforcement too. Additional QR formats are a compatibility feature, not the first security priority. Fixing the return link's wallet/coin choice is safe and does not change keys.
- **L5 error hooks:** the audit found no demonstrated phrase leak. Retain the no-outside-scripts rule and avoid putting sensitive material in errors; no urgent removal is established.

## Proposed approval boundary

**Approve first:** verified site identity/return links; production-versus-preview separation; malformed-request, expiry and pocket validation; correct coin/wallet return choice; targeted dependency repairs; carefully tested nonce/basic page protections that preserve preview and wallet behavior.

**Hold or skip:** changing pocket derivation or signature bytes; displaying recovery words; extra derivation secrets without an access/recovery design; blanket host redirects; broad HSTS/opener policies without compatibility checks; shared-domain cookies and fingerprinting as supposed standalone cures; blanket dependency upgrades.

**Coordinate separately in SEEDS:** session delivery and safe cross-device authorization for H2, then outside-wallet authentication/recovery redesign and migration for H1/M4. The copied protocol files must remain synchronized with SEEDS.

**Release gate:** repair approval is not permission to publish. After repairs, provide the auditor a fresh source packet, concrete adversarial tests for forwarded links and signature phishing, legacy-wallet recovery checks, and live-host header/scan/wallet checks. Obtain the required third-party re-audit before publication.

## Verification limits

No live account takeover was attempted; no wallet or recovery data was collected. No hosted login settings, deployment headers or production dependencies were independently read in this review. Audit claims about full bundle contents and runtime safety remain the auditor's observations unless explicitly checked above. The SEEDS snapshot may differ from its deployed version. No application files were changed.