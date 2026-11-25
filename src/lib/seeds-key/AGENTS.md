# Key boundary rules

- Keep the upstream Vault protocol verbatim under `key-signin`; configure its independently verified signer through the local wrapper so upstream empty defaults cannot disable production pairing.
- Add upstream manifest checks to, never in place of, Key's host-dependent trust and exact-endpoint checks; stronger local checks prevent preview-to-production key handoffs.
- Accept bounded signed future request paths without enabling extra response keys; request compatibility must not silently expand exports.
- Keep post-submit confirmation visible and return explicitly to SEEDS; reloading a consumed challenge can erase held-change instructions.
