import { hex, base58 } from "@scure/base";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { buildHandoff, coinIdentityKey, signTxcMessage, walletPocketWords } from "@/lib/key-signin/seeds-key-reference";
import { walletPocketMessage } from "@/lib/key-signin/rules";
import { submitWithRetry, validateActiveManifest, type FullManifest } from "./manifest";

/** Plain words, or SeedQR "standard" (4 digits per word). Returns null if not a valid phrase. */
export function phraseFromQr(text: string): string | null {
  const t = text.trim();
  let words = t.toLowerCase().split(/\s+/).join(" ");
  if (/^\d+$/.test(t) && (t.length === 48 || t.length === 96)) {
    words = (t.match(/.{4}/g) ?? []).map((d) => wordlist[Number(d)] ?? "").join(" ");
  }
  return validateMnemonic(words, wordlist) ? words : null;
}

export async function coinSignIn(manifest: FullManifest, words: string) {
  validateActiveManifest(manifest);
  if (manifest.kinds && !manifest.kinds.includes("coin")) throw new Error("This request doesn't allow coin sign-in. Start again on Seeds.");
  const key = coinIdentityKey(words);
  try {
    const identity = signTxcMessage(key, "x").address;
    return await submitWithRetry(
      manifest,
      (account) => buildHandoff({ manifest, words, kind: "coin", identity, ...(account ? { account } : {}) }),
      async (m) => signTxcMessage(key, m).signature,
    );
  } finally {
    key.fill(0);
  }
}

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
type Sol = { connect: () => Promise<{ publicKey: { toBytes(): Uint8Array; toString(): string } }>; signMessage: (b: Uint8Array, e?: string) => Promise<{ signature: Uint8Array }> };
const w = () => window as unknown as { ethereum?: Eth; phantom?: { solana?: Sol } };
export const hasEvm = () => typeof window !== "undefined" && !!w().ethereum;
export const hasSol = () => typeof window !== "undefined" && !!w().phantom?.solana;

const toHexMsg = (s: string) => "0x" + hex.encode(new TextEncoder().encode(s));
const SAME_ERR = "Your wallet gave two different signatures, so it can't rebuild the same pocket each time (this happens with smart-contract and passkey wallets). Use a Cold Storage Coin or HME Wallet instead.";

export async function walletSignIn(manifest: FullManifest, which: "evm" | "sol", onStep: (s: string) => void) {
  validateActiveManifest(manifest);
  if (manifest.kinds && !manifest.kinds.includes(which)) throw new Error("This request doesn't allow this wallet. Start again on Seeds.");
  const host = location.host;
  const pm = walletPocketMessage(host);
  let identity: string, sigBytes: Uint8Array, sign: (m: string) => Promise<string>;
  if (which === "evm") {
    const eth = w().ethereum;
    if (!eth) throw new Error("No Ethereum wallet was found in this browser.");
    const [addr] = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    if (!addr) throw new Error("No wallet account was shared.");
    identity = addr;
    const ps = (m: string) => eth.request({ method: "personal_sign", params: [toHexMsg(m), addr] }) as Promise<string>;
    onStep("Signature 1 of 3 — creates your pocket");
    const a = await ps(pm);
    onStep("Signature 2 of 3 — checks it's repeatable");
    const b = await ps(pm);
    if (a.toLowerCase() !== b.toLowerCase()) throw new Error(SAME_ERR);
    sigBytes = hex.decode(a.replace(/^0x/, ""));
    sign = ps;
  } else {
    const sol = w().phantom?.solana;
    if (!sol) throw new Error("No Solana wallet was found in this browser.");
    const { publicKey } = await sol.connect();
    identity = base58.encode(publicKey.toBytes());
    const sm = async (m: string) => (await sol.signMessage(new TextEncoder().encode(m), "utf8")).signature;
    onStep("Signature 1 of 3 — creates your pocket");
    const a = await sm(pm);
    onStep("Signature 2 of 3 — checks it's repeatable");
    const b = await sm(pm);
    if (hex.encode(a) !== hex.encode(b)) throw new Error(SAME_ERR);
    sigBytes = a;
    sign = async (m) => hex.encode(await sm(m));
  }
  let words = "";
  try {
    validateActiveManifest(manifest);
    words = walletPocketWords(sigBytes, host);
    sigBytes.fill(0);
    return await submitWithRetry(
      manifest,
      (account) => buildHandoff({ manifest, words, kind: which, identity, ...(account ? { account } : {}) }),
      async (m) => { onStep("Signature 3 of 3 — signs you in on Seeds"); return sign(m); },
    );
  } finally {
    sigBytes.fill(0);
    words = "";
  }
}
