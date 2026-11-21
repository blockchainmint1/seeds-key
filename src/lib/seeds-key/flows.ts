import { hex, base58 } from "@scure/base";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { buildHandoff, coinIdentityKey, signTxcMessage, walletPocketWords } from "@/lib/key-signin/seeds-key-reference";
import { walletPocketMessage, shortKeyName, normalizeIdentity } from "@/lib/key-signin/rules";
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

export async function coinSignIn(manifest: FullManifest, words: string, onIdentity: (name: string) => void = () => {}) {
  validateActiveManifest(manifest);
  if (manifest.kinds && !manifest.kinds.includes("coin")) throw new Error("This request doesn't allow coin sign-in. Start again on Seeds.");
  const key = coinIdentityKey(words);
  try {
    const identity = signTxcMessage(key, "x").address;
    onIdentity(shortKeyName("coin", identity));
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
type SolSignInInput = { domain: string; address: string; statement: string; uri: string; version: string; chainId: string; nonce: string; issuedAt: string; expirationTime?: string; resources?: string[] };
type Sol = { signIn?: (input: SolSignInInput) => Promise<{ signedMessage: Uint8Array; signature: Uint8Array }>; connect: () => Promise<{ publicKey: { toBytes(): Uint8Array; toString(): string } }>; signMessage: (b: Uint8Array, e?: string) => Promise<{ signature: Uint8Array }> };
const w = () => window as unknown as { ethereum?: Eth; phantom?: { solana?: Sol } };
export const hasEvm = () => typeof window !== "undefined" && !!w().ethereum;
export const hasSol = () => typeof window !== "undefined" && !!w().phantom?.solana;

const toHexMsg = (s: string) => "0x" + hex.encode(new TextEncoder().encode(s));
const SAME_ERR = "Your wallet gave two different signatures, so it can't rebuild the same pocket each time (this happens with smart-contract and passkey wallets). Use a Cold Storage Coin or HME Wallet instead.";

export async function walletSignIn(manifest: FullManifest, which: "evm" | "sol", onStep: (s: string) => void, onIdentity: (name: string) => void = () => {}, options: { ethereum?: Eth; signal?: AbortSignal } = {}) {
  options.signal?.throwIfAborted();
  validateActiveManifest(manifest);
  if (manifest.kinds && !manifest.kinds.includes(which)) throw new Error("This request doesn't allow this wallet. Start again on Seeds.");
  const host = window.location.host;
  let identity: string, sigBytes: Uint8Array, sign: (m: string) => Promise<string>;
  if (which === "evm") {
    const eth = options.ethereum ?? w().ethereum;
    if (!eth) throw new Error("No Ethereum wallet was found in this browser.");
    const [addr] = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    if (!addr) throw new Error("No wallet account was shared.");
    identity = normalizeIdentity("evm", addr) ?? "";
    if (!identity) throw new Error("The wallet shared an invalid address.");
    onIdentity(shortKeyName("evm", identity));
    const pm = walletPocketMessage(host, "evm", identity);
    const ps = async (m: string) => {
      options.signal?.throwIfAborted();
      const signature = await eth.request({ method: "personal_sign", params: [toHexMsg(m), addr] }) as string;
      options.signal?.throwIfAborted();
      return signature;
    };
    onStep("Signature 1 of 3 — creates your pocket");
    const a = await ps(pm);
    onStep("Signature 2 of 3 — checks it's repeatable");
    const b = await ps(pm);
    if (a.toLowerCase() !== b.toLowerCase()) throw new Error(SAME_ERR);
    if (!/^0x[0-9a-fA-F]{130}$/.test(a)) throw new Error("The wallet returned an invalid signature.");
    sigBytes = hex.decode(a.replace(/^0x/, ""));
    sign = ps;
  } else {
    const sol = w().phantom?.solana;
    if (!sol) throw new Error("No Solana wallet was found in this browser.");
    const { publicKey } = await sol.connect();
    identity = base58.encode(publicKey.toBytes());
    if (!normalizeIdentity("sol", identity)) throw new Error("The wallet shared an invalid address.");
    onIdentity(shortKeyName("sol", identity));
    const pm = walletPocketMessage(host, "sol", identity);
    const sm = async (m: string) => signSolanaText(sol, m, onStep);
    onStep("Signature 1 of 3 — creates your pocket");
    const a = await sm(pm);
    try {
      onStep("Signature 2 of 3 — checks it's repeatable");
      const b = await sm(pm);
      try { if (hex.encode(a) !== hex.encode(b)) throw new Error(SAME_ERR); }
      finally { b.fill(0); }
    } catch (e) { a.fill(0); throw e; }
    sigBytes = a;
    sign = async (m) => {
      const bytes = await sm(m);
      try { return hex.encode(bytes); } finally { bytes.fill(0); }
    };
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
      options.signal,
    );
  } finally {
    sigBytes.fill(0);
    words = "";
  }
}

/** Only our generated SIWS layout is accepted; wallet formatting must not alter pocket derivation. */
export async function signSolanaText(sol: Pick<Sol, "signIn" | "signMessage">, message: string, onStep: (s: string) => void): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(message);
  if (sol.signIn) {
    const lines = message.split("\n");
    const field = (name: string) => lines.find((line) => line.startsWith(`${name}: `))?.slice(name.length + 2) ?? "";
    const resourceIndex = lines.indexOf("Resources:");
    const input: SolSignInInput = {
      domain: lines[0]?.split(" wants you to sign in")[0] ?? "", address: lines[1] ?? "",
      statement: lines[3] ?? "", uri: field("URI"), version: field("Version"), chainId: field("Chain ID"),
      nonce: field("Nonce"), issuedAt: field("Issued At"),
      ...(field("Expiration Time") ? { expirationTime: field("Expiration Time") } : {}),
      ...(resourceIndex >= 0 ? { resources: lines.slice(resourceIndex + 1).map((line) => line.slice(2)) } : {}),
    };
    const result = await sol.signIn(input);
    const exact = result.signedMessage.length === bytes.length && result.signedMessage.every((byte, i) => byte === bytes[i]);
    if (exact && result.signature.length === 64) return result.signature;
    result.signature.fill(0);
  }
  onStep("Check the address bar says key.seeds.honest.money before signing.");
  const result = await sol.signMessage(bytes, "utf8");
  if (result.signature.length !== 64) { result.signature.fill(0); throw new Error("The wallet returned an invalid signature."); }
  return result.signature;
}
