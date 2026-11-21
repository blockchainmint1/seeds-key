# Approved security repairs

- [x] Validate manifest identity, known endpoints, field types, expiry and pocket bounds; separate production and preview trust.
- [x] Add request-specific script nonces and basic security headers without disrupting the editor preview or wallet popups.
- [x] Preserve the coin/wallet return choice and prevent stale requests from continuing.
- [x] Apply targeted dependency repairs and run regression/adversarial checks.
- [x] Deliver a fresh source packet and verification report for the independent auditor.
- [ ] Coordinate H2 session delivery with SEEDS — blocked: SEEDS is read-only from this project; no protocol change is approved here.
- [ ] Resolve H1/M4 wallet phishing/recovery — blocked: redesign and legacy-pocket migration are explicitly on hold.
- [ ] Publish — blocked: withheld by Bobby pending separate repairs and third-party re-audit.- [x] Re-audit tidy-ups: localhost trust limited to development builds; unused UI packages removed (dependency warnings 25 -> 3, all build tooling).
