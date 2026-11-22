import { useEffect, useRef, useState } from "react";
import { Bluetooth, Usb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_LEDGER_PATH,
  explainLedgerError,
  ledgerCapabilities,
  ledgerSignIn,
  prepareLedger,
  type LedgerKind,
  type PreparedLedger,
} from "@/lib/seeds-key/ledger";
import type { FullManifest, HandoffResult } from "@/lib/seeds-key/manifest";

export function LedgerFlow({
  manifest,
  onDone,
  onIdentity,
  disabled,
  onBusy,
}: {
  manifest: FullManifest;
  onDone: (result: HandoffResult) => void;
  onIdentity: (name: string) => void;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const prepared = useRef<PreparedLedger | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [capabilities, setCapabilities] = useState({ hid: false, ble: false });
  const [ready, setReady] = useState(false);
  const [reload, setReload] = useState(0);
  const [path, setPath] = useState(DEFAULT_LEDGER_PATH);
  const [identity, setIdentity] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setCapabilities(ledgerCapabilities());
    setReady(false);
    prepared.current = null;
    if (ledgerCapabilities().hid || ledgerCapabilities().ble) {
      prepareLedger().then(
        (sdk) => {
          if (mounted) {
            prepared.current = sdk;
            setReady(true);
            setError(null);
          }
        },
        () => {
          if (mounted) setError("Couldn't load Ledger support. Try again.");
        },
      );
    }
    return () => {
      mounted = false;
      controller.current?.abort();
    };
  }, [reload]);

  async function connect(kind: LedgerKind) {
    const sdk = prepared.current;
    if (!sdk || controller.current || disabled) return;
    const active = new AbortController();
    controller.current = active;
    setError(null);
    setIdentity(null);
    setStep(kind === "hid" ? "Choose your USB Ledger…" : "Choose your Bluetooth Ledger…");
    onBusy(true);
    try {
      const result = await ledgerSignIn(
        manifest,
        sdk,
        kind,
        path,
        setStep,
        (name) => {
          setIdentity(name);
          onIdentity(name);
        },
        active.signal,
      );
      if (!active.signal.aborted) onDone(result);
    } catch (e) {
      if (!active.signal.aborted) setError(explainLedgerError(e));
    } finally {
      if (!active.signal.aborted) setStep(null);
      controller.current = null;
      onBusy(false);
    }
  }

  const allowed = !manifest.kinds || manifest.kinds.includes("evm");
  return (
    <fieldset className="space-y-4 border-t border-border pt-5" disabled={disabled && !step}>
      <h2 className="text-2xl">Ledger</h2>
      <p className="text-sm text-muted-foreground">
        Unlock your Ledger and open the Ethereum app. Confirm the address and three signatures on
        the device.
      </p>
      <p className="text-sm text-muted-foreground">
        Only continue on key.seeds.honest.money from your own Seeds screen. Direct Ledger signing
        has no browser-wallet origin warning.
      </p>
      <label className="block space-y-2 text-sm">
        <span>Ethereum account path</span>
        <input
          aria-label="Ethereum account path"
          aria-describedby="ledger-path-recovery"
          value={path}
          onChange={(event) => {
            setPath(event.target.value);
            setIdentity(null);
          }}
          disabled={!!step || disabled}
          spellCheck={false}
          autoComplete="off"
          className="h-12 w-full min-w-0 rounded-md border border-input bg-background px-3 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {identity && (
        <p aria-label="Ledger account" className="break-words font-mono text-sm text-primary">
          {identity}
        </p>
      )}
      <p id="ledger-path-recovery" className="text-sm text-muted-foreground">
        Use the same Ethereum account path every time. A different path opens a different Seeds
        pocket.
      </p>
      {step ? (
        <div className="flex items-center justify-between gap-3">
          <p role="status" className="text-primary">
            {step}
          </p>
          <Button
            size="icon"
            variant="outline"
            aria-label="Cancel Ledger connection"
            title="Cancel Ledger connection"
            onClick={() => {
              controller.current?.abort();
              setStep(null);
            }}
          >
            <X />
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            disabled={!ready || !capabilities.hid || !allowed || disabled}
            onClick={() => {
              void connect("hid");
            }}
          >
            <Usb /> Ledger USB
          </Button>
          <Button
            variant="secondary"
            disabled={!ready || !capabilities.ble || !allowed || disabled}
            onClick={() => {
              void connect("ble");
            }}
          >
            <Bluetooth /> Ledger Bluetooth
          </Button>
        </div>
      )}
      {!capabilities.hid && !capabilities.ble && (
        <p className="text-sm text-muted-foreground">
          USB and Bluetooth aren't available here. Try Chrome or Edge on a supported device, or
          connect Ledger through MetaMask or Rabby.
        </p>
      )}
      {capabilities.hid && !capabilities.ble && (
        <p className="text-sm text-muted-foreground">Bluetooth isn't available in this browser.</p>
      )}
      {!allowed && (
        <p className="text-sm text-muted-foreground">
          This request doesn't allow Ethereum wallets.
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-3 text-sm text-destructive">
          <p>{error}</p>
          {!ready && (
            <Button variant="outline" onClick={() => setReload((value) => value + 1)}>
              Retry Ledger loading
            </Button>
          )}
        </div>
      )}
    </fieldset>
  );
}
