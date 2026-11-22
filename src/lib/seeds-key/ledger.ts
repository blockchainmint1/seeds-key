import type Eth from "@ledgerhq/hw-app-eth";
import type Transport from "@ledgerhq/hw-transport";
import { normalizeIdentity } from "@/lib/key-signin/rules";
import { walletSignIn } from "./flows";
import { validateActiveManifest, type FullManifest } from "./manifest";

export type LedgerKind = "hid" | "ble";
type Factory = { request?: () => Promise<Transport>; create: () => Promise<Transport> };
export type LedgerSession = {
  eth: Pick<Eth, "getAddress" | "signPersonalMessage">;
  close: () => Promise<void>;
  onDisconnect: (listener: () => void) => () => void;
};
export type PreparedLedger = { open: (kind: LedgerKind) => Promise<LedgerSession> };

export const DEFAULT_LEDGER_PATH = "m/44'/60'/0'/0/0";

export function ledgerCapabilities() {
  const supported =
    typeof window !== "undefined" && window.isSecureContext && typeof navigator !== "undefined";
  return { hid: !!supported && "hid" in navigator, ble: !!supported && "bluetooth" in navigator };
}

/** Ethereum only; both Ledger Live and legacy Ethereum receiving paths. Never persist the selected path. */
export function checkedLedgerPath(value: string): string {
  const path = value.trim().replace(/^m\//, "");
  if (
    !/^44'\/60'\/\d+'\/\d+(?:\/\d+)?$/.test(path) ||
    path
      .split("/")
      .some(
        (part) =>
          !Number.isSafeInteger(Number(part.replace("'", ""))) ||
          Number(part.replace("'", "")) >= 0x80000000,
      )
  ) {
    throw new Error("Enter a valid Ethereum account path, such as m/44'/60'/0'/0/0.");
  }
  return path;
}

/** Ledger's Ethereum app already returns Ethereum personal_sign form. Do not rewrite recovery bytes or pocket inputs. */
export function ledgerPersonalSignature(value: { r: string; s: string; v: number }): string {
  if (
    !/^[a-f0-9]{64}$/i.test(value.r) ||
    !/^[a-f0-9]{64}$/i.test(value.s) ||
    ![27, 28].includes(value.v)
  ) {
    throw new Error("Ledger returned an unsupported signature. No pocket was submitted.");
  }
  return `0x${value.r}${value.s}${value.v.toString(16)}`;
}

function constructorOf<T>(mod: unknown): T {
  let value = mod;
  for (let i = 0; i < 3; i++) {
    if (typeof value === "function") return value as T;
    value = (value as { default?: unknown } | null)?.default;
  }
  throw new Error("Couldn't load Ledger support. Reload this page and try again.");
}

/** Called after Continue only. Load before the click so device permission stays inside the user gesture. */
export async function prepareLedger(): Promise<PreparedLedger> {
  if (typeof window === "undefined") throw new Error("Ledger requires a browser.");
  const capabilities = ledgerCapabilities();
  if (!capabilities.hid && !capabilities.ble)
    throw new Error(
      "USB and Bluetooth aren't available in this browser. Try Chrome or Edge on a supported device.",
    );
  const { Buffer } = await import("buffer/index.js");
  const g = globalThis as unknown as { Buffer?: unknown; global?: unknown };
  g.Buffer = Buffer;
  g.global = globalThis;
  const EthApp = constructorOf<typeof Eth>(await import("@ledgerhq/hw-app-eth"));
  const hid = capabilities.hid
    ? constructorOf<Factory>(await import("@ledgerhq/hw-transport-webhid"))
    : null;
  const ble = capabilities.ble
    ? constructorOf<Factory>(await import("@ledgerhq/hw-transport-web-ble"))
    : null;
  return {
    async open(kind) {
      const factory = kind === "hid" ? hid : ble;
      if (!factory)
        throw new Error(`${kind === "hid" ? "USB" : "Bluetooth"} isn't available in this browser.`);
      const transport = await (kind === "hid" && factory.request
        ? factory.request()
        : factory.create());
      let closed = false;
      const close = async () => {
        if (!closed) {
          closed = true;
          await transport.close().catch(() => {});
        }
      };
      try {
        return {
          eth: new EthApp(transport),
          close,
          onDisconnect: (listener) => {
            transport.on("disconnect", listener);
            return () => {
              transport.off("disconnect", listener);
            };
          },
        };
      } catch (error) {
        await close();
        throw error;
      }
    },
  };
}

export async function ledgerSignIn(
  manifest: FullManifest,
  prepared: PreparedLedger,
  kind: LedgerKind,
  selectedPath: string,
  onStep: (step: string) => void,
  onIdentity: (identity: string) => void,
  signal: AbortSignal,
) {
  validateActiveManifest(manifest);
  signal.throwIfAborted();
  if (manifest.kinds && !manifest.kinds.includes("evm"))
    throw new Error("This request doesn't allow Ethereum wallets. Start again on Seeds.");
  const path = checkedLedgerPath(selectedPath);
  // This call must precede any await so the prepared SDK opens its picker on the click.
  const session = await prepared.open(kind);
  const active = new AbortController();
  const activeSignal = active.signal;
  const abortFromCaller = () => active.abort(signal.reason);
  const abortClose = () => {
    void session.close();
  };
  let stopListening = () => {};
  try {
    // Wire both cancellation sources without AbortSignal.any (absent in older Chromium).
    // All post-picker setup belongs inside cleanup, including listener registration.
    activeSignal.addEventListener("abort", abortClose, { once: true });
    signal.addEventListener("abort", abortFromCaller, { once: true });
    if (signal.aborted) abortFromCaller();
    activeSignal.throwIfAborted();
    stopListening = session.onDisconnect(() =>
      active.abort(new Error("Ledger disconnected. Reconnect it and start again.")),
    );
    activeSignal.throwIfAborted();
    validateActiveManifest(manifest);
    onStep("Confirm your Ethereum address on Ledger…");
    const result = await session.eth.getAddress(path, true, false);
    activeSignal.throwIfAborted();
    const address = normalizeIdentity("evm", result.address);
    if (!address) throw new Error("Ledger returned an invalid Ethereum address.");
    return await walletSignIn(manifest, "evm", onStep, onIdentity, {
      signal: activeSignal,
      ethereum: {
        async request({ method, params }) {
          activeSignal.throwIfAborted();
          validateActiveManifest(manifest);
          if (method === "eth_requestAccounts") return [address];
          if (
            method !== "personal_sign" ||
            params?.[1] !== address ||
            typeof params[0] !== "string" ||
            !/^0x(?:[0-9a-f]{2})+$/i.test(params[0])
          ) {
            throw new Error("Ledger was asked to sign an invalid request.");
          }
          const signature = await session.eth.signPersonalMessage(path, params[0].slice(2));
          activeSignal.throwIfAborted();
          return ledgerPersonalSignature(signature);
        },
      },
    });
  } finally {
    signal.removeEventListener("abort", abortFromCaller);
    activeSignal.removeEventListener("abort", abortClose);
    try {
      stopListening();
    } finally {
      await session.close();
    }
  }
}

export function explainLedgerError(error: unknown): string {
  const code = (error as { statusCode?: number } | null)?.statusCode;
  const name = error instanceof Error ? error.name : "";
  if (code === 0x6985 || /cancel|denied|NotFound/i.test(name))
    return "Ledger approval was cancelled. Nothing was submitted; reconnect when you're ready.";
  if (code === 0x650e)
    return "Unlock Ledger and open its Ethereum app, then try again. If the app is already open, close and reopen it. (Ledger error 0x650e.)";
  if ([0x6e00, 0x6d00, 0x6511, 0x650f].includes(code ?? 0))
    return "Unlock Ledger and open its Ethereum app, then try again.";
  if (code === 0x5515) return "Unlock Ledger with your PIN and open its Ethereum app.";
  if (name === "SecurityError")
    return "Device access was blocked. Open the Seeds Key page directly in Chrome or Edge and try again.";
  return error instanceof Error && error.name !== "AbortError"
    ? error.message
    : "Ledger connection cancelled. Nothing was submitted.";
}
