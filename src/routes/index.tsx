import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LedgerFlow } from "@/components/LedgerFlow";
import { VaultFlow } from "@/components/VaultFlow";
import { Page } from "@/components/SiteFooter";
import {
  loadManifest,
  seedsReturnUrl,
  validateActiveManifest,
  type FullManifest,
  type HandoffResult,
} from "@/lib/seeds-key/manifest";
import { pairingCode } from "@/lib/key-signin/rules";
import { coinSignIn, hasEvm, hasSol, phraseFromQr, walletSignIn } from "@/lib/seeds-key/flows";

type Search = { kind?: "coin" | "wallet"; r?: string };

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(s["kind"] === "coin" || s["kind"] === "wallet" ? { kind: s["kind"] } : {}),
    ...(typeof s["r"] === "string" ? { r: s["r"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Seeds Key — sign in to Seeds with your coin or wallet" },
      {
        name: "description",
        content:
          "Open your Seeds Exchange account with a Cold Storage Coin or your own wallet. Your recovery phrase never leaves your device.",
      },
      { property: "og:title", content: "Seeds Key — sign in with your coin or wallet" },
      {
        property: "og:description",
        content: "The easy, private onramp to Seeds Exchange for TXC, ISK and ZCU holders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Done = HandoffResult;

function Index() {
  const { kind, r } = Route.useSearch();
  const [manifest, setManifest] = useState<FullManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [acceptedChallenge, setAcceptedChallenge] = useState<string | null>(null);
  const [signer, setSigner] = useState<string | null>(null);

  useEffect(() => {
    setManifest(null);
    setDone(null);
    setError(null);
    setAcceptedChallenge(null);
    setSigner(null);
    if (!r) return;
    const controller = new AbortController();
    loadManifest(r, controller.signal).then(
      (m) => {
        if (!controller.signal.aborted) setManifest(m);
      },
      (e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      },
    );
    return () => controller.abort();
  }, [r]);

  return (
    <Page>
      <div className="animate-sprout">
        {!r ? (
          <Welcome />
        ) : done && manifest ? (
          <Success manifest={manifest} done={done} kind={kind ?? "coin"} signer={signer} />
        ) : error && !manifest ? (
          <Problem text={error} />
        ) : !manifest ? (
          <p className="text-muted-foreground">Checking this request with Seeds…</p>
        ) : (
          <>
            <SiteBadge m={manifest} />
            {acceptedChallenge !== manifest.challenge_id ? (
              <div className="space-y-5 text-center">
                <h1 className="text-3xl">Check your match code</h1>
                <div className="font-mono text-7xl text-primary" aria-label="Match code">
                  {pairingCode(manifest.challenge)}
                </div>
                <p className="text-muted-foreground">
                  Your Seeds screen shows a match code. Only continue if it's the same three digits.
                  If you didn't start this on your own Seeds screen, stop.
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    try {
                      validateActiveManifest(manifest);
                      setAcceptedChallenge(manifest.challenge_id);
                      setError(null);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Start again on Seeds.");
                    }
                  }}
                >
                  Continue
                </Button>
                {error && <Problem text={error} />}
              </div>
            ) : (
              <>
                {signer && (
                  <p className="mb-5 break-words font-mono text-lg text-primary">{signer}</p>
                )}
                {kind === "wallet" ? (
                  <WalletFlow m={manifest} onDone={setDone} onIdentity={setSigner} />
                ) : (
                  <CoinChoice m={manifest} onDone={setDone} onIdentity={setSigner} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </Page>
  );
}

function Welcome() {
  return (
    <div className="space-y-6">
      <h1 className="text-5xl leading-tight">
        Securely access seeds with your own coin or wallet.
      </h1>
      <p className="text-lg text-muted-foreground">
        Seeds Key lets traders open a Seeds Exchange account with a Cold Storage Coin or their own
        wallet — no passwords, and your recovery phrase never leaves this device.
      </p>
      <div>
        <h2 className="text-xl">Supported methods</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
          <li>
            <a className="text-primary underline" href="https://vault.honest.money">
              HME Vault
            </a>
          </li>
          <li>
            <a className="text-primary underline" href="https://coldstoragecoins.com">
              Cold Storage Coin
            </a>
          </li>
          <li>
            <a className="text-primary underline" href="https://www.ledger.com">
              Ledger
            </a>{" "}
            (USB &amp; Bluetooth)
          </li>
          <li>
            Your own wallet —{" "}
            <a className="text-primary underline" href="https://metamask.io">
              MetaMask
            </a>
            , Rabby, Coinbase,{" "}
            <a className="text-primary underline" href="https://phantom.com">
              Phantom
            </a>
          </li>
        </ul>
      </div>
      <div className="panel p-5 text-sm text-muted-foreground">
        Start from{" "}
        <a className="text-primary underline" href="https://seeds.honest.money">
          seeds.honest.money
        </a>{" "}
        and choose “Start with a coin” or “Use my wallet”. Seeds will send you here.
      </div>
    </div>
  );
}

function SiteBadge({ m }: { m: FullManifest }) {
  return (
    <div className="panel mb-6 flex items-center gap-3 p-4">
      <ShieldCheck className="size-6 shrink-0 text-success" />
      <div className="text-sm">
        <div>
          You're signing in to <strong>{m.app_name}</strong>
        </div>
        <div className="font-mono text-muted-foreground">{m.origin}</div>
      </div>
    </div>
  );
}

function Problem({ text }: { text: string }) {
  return <div className="panel border-destructive/50 p-5 text-destructive">{text}</div>;
}

function CoinChoice({
  m,
  onDone,
  onIdentity,
}: {
  m: FullManifest;
  onDone: (d: Done) => void;
  onIdentity: (name: string) => void;
}) {
  const [vault, setVault] = useState(false);
  return (
    <div className="space-y-6">
      {vault ? (
        <VaultFlow m={m} onDone={onDone} onIdentity={onIdentity} />
      ) : (
        <CoinFlow m={m} onDone={onDone} onIdentity={onIdentity} />
      )}
      {m.vault_request !== undefined && (
        <Button variant="outline" className="w-full" onClick={() => setVault((v) => !v)}>
          {vault ? "Scan a Cold Storage Coin instead" : "Use HME Vault instead"}
        </Button>
      )}
    </div>
  );
}

function CoinFlow({
  m,
  onDone,
  onIdentity,
}: {
  m: FullManifest;
  onDone: (d: Done) => void;
  onIdentity: (name: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!scanning) return;
    try {
      validateActiveManifest(m);
      if (m.kinds && !m.kinds.includes("coin"))
        throw new Error("This request doesn't allow coin sign-in. Start again on Seeds.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Start again on Seeds.");
      setScanning(false);
      return;
    }
    let stream: MediaStream | null = null,
      raf = 0,
      stop = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      setErr("Couldn't open the camera. Try again.");
      setScanning(false);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(
      (s) => {
        stream = s;
        const v = video.current;
        if (stop || !v) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        v.srcObject = s;
        v.play();
        const tick = () => {
          if (stop) return;
          if (v.readyState >= 2) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height);
            img.data.fill(0);
            if (code) {
              const words = phraseFromQr(code.data);
              if (words) {
                stop = true;
                setScanning(false);
                setBusy(true);
                setErr(null);
                coinSignIn(m, words, onIdentity)
                  .then(onDone, (e: Error) => setErr(e.message))
                  .finally(() => setBusy(false));
                return;
              }
              setErr("That QR isn't a recovery phrase. Scan the phrase QR under your coin's seal.");
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      },
      () => {
        setErr("Camera access was blocked. Allow the camera and try again.");
        setScanning(false);
      },
    );
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [scanning, m, onDone, onIdentity]);

  return (
    <div className="space-y-5">
      <h1 className="text-4xl">Scan your Cold Storage Coin</h1>
      <p className="text-muted-foreground">
        Point your camera at the recovery-phrase QR. The words are never shown, sent or saved — only
        a signature and your sealed trading pocket go to Seeds.
      </p>
      {scanning && (
        <video
          ref={video}
          playsInline
          muted
          className="aspect-square w-full rounded-2xl bg-muted object-cover"
        />
      )}
      {busy ? (
        <p className="text-primary">Building your trading pocket and signing you in…</p>
      ) : (
        !scanning && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setErr(null);
              setScanning(true);
            }}
          >
            <Camera /> Open camera
          </Button>
        )
      )}
      {err && <Problem text={err} />}
    </div>
  );
}

function WalletFlow({
  m,
  onDone,
  onIdentity,
}: {
  m: FullManifest;
  onDone: (d: Done) => void;
  onIdentity: (name: string) => void;
}) {
  const [step, setStep] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [avail, setAvail] = useState({ evm: false, sol: false });
  const [ledgerBusy, setLedgerBusy] = useState(false);
  useEffect(() => setAvail({ evm: hasEvm(), sol: hasSol() }), []);
  const go = (which: "evm" | "sol") => {
    if (ledgerBusy || step) return;
    try {
      validateActiveManifest(m);
      if (m.kinds && !m.kinds.includes(which))
        throw new Error("This request doesn't allow this wallet. Start again on Seeds.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Start again on Seeds.");
      return;
    }
    setErr(null);
    setStep("Connecting…");
    walletSignIn(m, which, setStep, onIdentity)
      .then(onDone, (e: Error) => setErr(e.message))
      .finally(() => setStep(null));
  };
  return (
    <div className="space-y-5">
      <h1 className="text-4xl">Use your own wallet</h1>
      <p className="text-muted-foreground">
        Your wallet will ask for three signatures. The first two build your Seeds trading pocket on
        this device; the third signs you in. No coins move.
      </p>
      {step ? (
        <p className="text-primary">{step}</p>
      ) : (
        <div className="grid gap-3 [&_button]:h-auto [&_button]:min-h-12 [&_button]:whitespace-normal [&_button]:py-3">
          <Button
            size="lg"
            disabled={!avail.evm || ledgerBusy || (!!m.kinds && !m.kinds.includes("evm"))}
            onClick={() => go("evm")}
          >
            <Wallet /> MetaMask, Rabby, Coinbase · Ledger/Trezor through wallet
          </Button>
          <Button
            size="lg"
            variant="secondary"
            disabled={!avail.sol || ledgerBusy || (!!m.kinds && !m.kinds.includes("sol"))}
            onClick={() => go("sol")}
          >
            <Wallet /> Phantom (Solana)
          </Button>
          {!avail.evm && !avail.sol && (
            <p className="text-sm text-muted-foreground">
              No browser wallet detected. You can connect Ledger directly below.
            </p>
          )}
        </div>
      )}
      <LedgerFlow
        manifest={m}
        onDone={onDone}
        onIdentity={onIdentity}
        disabled={!!step || ledgerBusy}
        onBusy={setLedgerBusy}
      />
      {err && <Problem text={err} />}
    </div>
  );
}

function Success({
  manifest,
  done,
  kind,
  signer,
}: {
  manifest: FullManifest;
  done: Done;
  kind: "coin" | "wallet";
  signer: string | null;
}) {
  return (
    <div className="space-y-5 text-center">
      {done.signedIn ? (
        <CheckCircle2 className="mx-auto size-16 text-success" />
      ) : (
        <ShieldCheck className="mx-auto size-16 text-primary" />
      )}
      <h1 className="text-4xl">
        {done.signedIn ? "Your key is ready on Seeds" : "Confirm on Seeds"}
      </h1>
      {signer && <p className="break-words font-mono text-lg text-primary">{signer}</p>}
      <p className="text-muted-foreground">
        {done.signedIn
          ? `${done.newAccount ? "Your new account is ready." : "Welcome back."} Trading pocket #${done.pocket}. Your Seeds screen will ask you to confirm this is you.`
          : "Finish on your Seeds screen — it will ask you to confirm the key change."}
      </p>
      <Button asChild size="lg">
        <a href={seedsReturnUrl(manifest, kind)}>Back to Seeds</a>
      </Button>
    </div>
  );
}
