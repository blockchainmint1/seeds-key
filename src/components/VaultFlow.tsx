import { useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import QRCode from "qrcode";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pairingCode } from "@/lib/key-signin/rules";
import { validateActiveManifest, type FullManifest, type HandoffResult } from "@/lib/seeds-key/manifest";
import { VaultAnswerCollector } from "@/lib/seeds-key/vault-scan";
import { SCAN_TIMEOUT_MS } from "@/lib/seeds-key/vault-protocol";
import { readVaultResponse, submitVaultHandoff, vaultRequestText, vaultSignerName } from "@/lib/seeds-key/vault-link";

export function VaultFlow({ m, onDone, onIdentity }: { m: FullManifest; onDone: (d: HandoffResult) => void; onIdentity: (name: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ have: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const request = useMemo(() => {
    try { return { text: vaultRequestText(m), error: null }; }
    catch (e) { return { text: null, error: e instanceof Error ? e.message : "Vault linking isn't ready. Use your coin or wallet instead." }; }
  }, [m]);

  useEffect(() => () => { abort.current?.abort(); }, [m]);
  useEffect(() => {
    if (!request.text || !canvas.current) return;
    let closed = false;
    const c = canvas.current;
    QRCode.toCanvas(c, request.text, { width: 300, margin: 2, errorCorrectionLevel: "M" })
      .catch(() => { if (!closed) setErr("Couldn't draw the request QR. Try again."); });
    return () => { closed = true; c.getContext("2d")?.clearRect(0, 0, c.width, c.height); };
  }, [request]);

  useEffect(() => {
    if (!scanning || !request.text) return;
    const controller = abort.current;
    if (!controller || controller.signal.aborted) return;
    const collector = new VaultAnswerCollector();
    let stream: MediaStream | null = null, raf = 0, stop = false, last = "";
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const release = () => {
      stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop());
      collector.clear(); last = ""; ctx?.clearRect(0, 0, c.width, c.height);
      if (video.current) video.current.srcObject = null;
    };
    const fail = (e: unknown) => {
      release(); controller.abort(); setScanning(false); setProgress(null);
      setErr(e instanceof Error ? e.message : "That QR couldn't be read. Try again.");
    };
    const check = () => { controller.signal.throwIfAborted(); validateActiveManifest(m); };
    try { check(); vaultRequestText(m); } catch (e) { fail(e); return; }
    if (!ctx) { fail(new Error("Couldn't open the camera. Try again.")); return; }
    const timeout = setTimeout(() => fail(new Error("The Vault scan timed out. Start again.")), Math.min(SCAN_TIMEOUT_MS, Math.max(0, Date.parse(m.expires_at) - Date.now())));
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(async (s) => {
      stream = s;
      const v = video.current;
      if (stop || controller.signal.aborted || !v) { s.getTracks().forEach((t) => t.stop()); return; }
      try { check(); v.srcObject = s; await v.play(); } catch (e) { if (!stop) fail(e); return; }
      const tick = () => {
        if (stop || controller.signal.aborted) return;
        try {
          check();
          if (v.readyState >= 2) {
            c.width = v.videoWidth; c.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, c.width, c.height);
            const code = jsQR(img.data, img.width, img.height);
            img.data.fill(0);
            if (code && code.data !== last) {
              last = code.data;
              const text = collector.add(code.data);
              const p = collector.progress;
              setProgress(p.total ? { have: p.have, total: p.total } : null);
              if (text) {
                check();
                const h = readVaultResponse(text, m);
                release(); clearTimeout(timeout); setScanning(false); setProgress(null);
                onIdentity(vaultSignerName(h)); setBusy(true); setErr(null);
                submitVaultHandoff(m, h, controller.signal).then((d) => {
                  if (!controller.signal.aborted) onDone(d);
                }, (e: unknown) => {
                  if (!controller.signal.aborted) setErr(e instanceof Error ? e.message : "Couldn't reach Seeds. Try again.");
                }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
                return;
              }
            }
          }
          raf = requestAnimationFrame(tick);
        } catch (e) { fail(e); }
      };
      if (!stop && !controller.signal.aborted) tick();
    }, () => { if (!stop) fail(new Error("Camera access was blocked. Allow the camera and try again.")); });
    return () => { clearTimeout(timeout); release(); };
  }, [scanning, request, m, onDone, onIdentity]);

  const cancel = () => { abort.current?.abort(); setScanning(false); setBusy(false); setProgress(null); onIdentity(""); };
  return (
    <div className="space-y-5">
      <h2 className="text-3xl">Use HME Vault</h2>
      <p className="text-muted-foreground">Only link from a Seeds screen you started yourself. Don't share this request QR.</p>
      <p className="text-muted-foreground">Seeds will be able to trade from pocket 1106 without asking you again. Your savings and recovery phrase stay on the Vault phone.</p>
      {request.text ? <>
        <p className="text-muted-foreground">Match code <strong className="font-mono text-primary">{pairingCode(m.challenge)}</strong> · pocket 1106 · all 16 chains</p>
        <div className="flex justify-center"><canvas ref={canvas} aria-label="Seeds request for HME Vault" className="max-w-full rounded-lg bg-background" /></div>
        {scanning && <video ref={video} playsInline muted className="aspect-square w-full rounded-lg bg-muted object-cover" />}
        {scanning && progress && <p className="text-primary">Got {progress.have} of {progress.total} parts</p>}
        {busy ? <p className="text-primary">Sending your sealed trading pocket to Seeds…</p> : !scanning && <Button size="lg" className="w-full" onClick={() => {
          abort.current?.abort(); abort.current = new AbortController(); setErr(null); setProgress(null); setScanning(true);
        }}><Camera /> Scan the Vault's answer</Button>}
        {(scanning || busy) && <Button variant="outline" className="w-full" onClick={cancel}><X /> Cancel</Button>}
      </> : <div role="alert" className="panel border-destructive/50 p-5 text-destructive">{request.error}</div>}
      {err && <div role="alert" className="panel border-destructive/50 p-5 text-destructive">{err}</div>}
    </div>
  );
}
