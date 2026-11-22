import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import QRCode from "qrcode";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pairingCode } from "@/lib/key-signin/rules";
import { validateActiveManifest, type FullManifest, type HandoffResult } from "@/lib/seeds-key/manifest";
import { PartCollector } from "@/lib/seeds-key/qr-parts";
import { readVaultResponse, submitVaultHandoff, vaultRequestText, vaultSignerName } from "@/lib/seeds-key/vault-link";

/** HME Vault: show Seeds' request as a QR, then read the Vault's animated answer. The phrase stays on the Vault phone. */
export function VaultFlow({ m, onDone, onIdentity }: { m: FullManifest; onDone: (d: HandoffResult) => void; onIdentity: (name: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ have: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (canvas.current) QRCode.toCanvas(canvas.current, vaultRequestText(m), { width: 300, margin: 2, errorCorrectionLevel: "M" }).catch(() => setErr("Couldn't draw the request QR. Try again."));
  }, [m]);

  useEffect(() => {
    if (!scanning) return;
    try { validateActiveManifest(m); } catch (e) { setErr(e instanceof Error ? e.message : "Start again on Seeds."); setScanning(false); return; }
    const collector = new PartCollector();
    let stream: MediaStream | null = null, raf = 0, stop = false, last = "";
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) { setErr("Couldn't open the camera. Try again."); setScanning(false); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((s) => {
      stream = s;
      const v = video.current;
      if (stop || !v) { s.getTracks().forEach((t) => t.stop()); return; }
      v.srcObject = s; v.play();
      const tick = () => {
        if (stop) return;
        if (v.readyState >= 2) {
          c.width = v.videoWidth; c.height = v.videoHeight;
          ctx.drawImage(v, 0, 0);
          const img = ctx.getImageData(0, 0, c.width, c.height);
          const code = jsQR(img.data, img.width, img.height);
          img.data.fill(0);
          if (code && code.data !== last) {
            last = code.data;
            try {
              const text = collector.add(code.data);
              setProgress(collector.progress.total ? { have: collector.progress.have, total: collector.progress.total } : null);
              if (text) {
                stop = true; setScanning(false);
                const h = readVaultResponse(text, m);
                onIdentity(vaultSignerName(h));
                setBusy(true); setErr(null);
                submitVaultHandoff(m, h).then(onDone, (e: Error) => setErr(e.message)).finally(() => setBusy(false));
                return;
              }
            } catch (e) {
              stop = true; setScanning(false); setProgress(null);
              setErr(e instanceof Error ? e.message : "That QR couldn't be read. Try again.");
              return;
            }
          }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }, () => { setErr("Camera access was blocked. Allow the camera and try again."); setScanning(false); });
    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [scanning, m, onDone, onIdentity]);

  return (
    <div className="space-y-5">
      <h2 className="text-3xl">Use HME Vault</h2>
      <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
        <li>On your Vault phone, choose <strong>Link to Seeds</strong> and scan this code.</li>
        <li>Check the Vault shows match code <strong className="font-mono text-primary">{pairingCode(m.challenge)}</strong> and pocket 1106, then approve.</li>
        <li>Scan the moving code the Vault shows. Your recovery phrase stays on the Vault.</li>
      </ol>
      <div className="flex justify-center"><canvas ref={canvas} aria-label="Seeds request for HME Vault" className="rounded-xl bg-background" /></div>
      {scanning && <video ref={video} playsInline muted className="aspect-square w-full rounded-2xl bg-muted object-cover" />}
      {scanning && progress && <p className="text-primary">Got {progress.have} of {progress.total} parts — keep the camera on the Vault…</p>}
      {busy ? <p className="text-primary">Sending your sealed trading pocket to Seeds…</p> : !scanning && (
        <Button size="lg" className="w-full" onClick={() => { setErr(null); setProgress(null); setScanning(true); }}><Camera /> Scan the Vault's answer</Button>
      )}
      {err && <div className="panel border-destructive/50 p-5 text-destructive">{err}</div>}
    </div>
  );
}
