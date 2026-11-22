# Linking HME Vault to Seeds (pocket 1106, all chains)

**What I found**
- HME Wallet already links to Seeds with its "instant access" link: it seals the pocket's private keys (xprv per chain, pocket 1106) to Seeds' one-time key. Seeds Key uses that exact same sealed format, so Seeds already accepts it.
- HME Vault is the offline phone. It has **no internet at all** (by design, the app ships without network permission). It only talks through QR codes, including animated multi-part QRs.
- Vault's own rules today: it **never sends seeds or private keys**, and its pairing QRs are **public keys only**. Handing Seeds the 1106 private keys reverses that rule, so it needs your OK.

**How it would work (recommended)**
1. Seeds Key shows the Seeds request as a QR (after the usual Continue + match code).
2. Vault scans it, shows "Seeds Exchange wants trading access to pocket 1106", you confirm.
3. Vault makes the 1106 keys for all 16 chains, locks them so only Seeds can open them, and shows an animated QR.
4. Seeds Key scans that QR with the computer's camera and passes it to Seeds. The recovery phrase never leaves the Vault phone.

The work is mostly in HME Vault (that project has to be changed from its own chat); Key adds the request QR and the animated-QR scanner. Both need an audit before going live.

**Quicker alternative**
Vault already has a seed QR. Scanning it with Key's existing Cold Storage Coin scanner works today with no new code — but that puts the full recovery phrase on an internet-connected computer's camera, which defeats the point of an offline vault. Not recommended.
