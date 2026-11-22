/** Key-specific bounds around the verbatim Vault HMQR2 collector. */
import { PartCollector } from "./qr-parts";
import { MAX_RESPONSE_CHARS } from "./vault-protocol";

export class VaultAnswerCollector {
  private collector = new PartCollector();
  private chunks = new Map<number, string>();
  private stored = 0;

  add(code: string): string | null {
    if (code.length > MAX_RESPONSE_CHARS)
      throw new Error("The Vault answer is too large. Start again.");
    const m = /^HMQR2:([a-f0-9]{8}):(\d+)\/(\d+):([\s\S]*)$/.exec(code);
    if (code.startsWith("HMQR") && !m)
      throw new Error("Update HME Vault to use its current QR format.");
    if (m) {
      const n = Number(m[2]),
        total = Number(m[3]),
        chunk = m[4];
      if (
        !Number.isInteger(n) ||
        n < 1 ||
        n > total ||
        total < 1 ||
        total > Math.ceil(MAX_RESPONSE_CHARS / 240) ||
        !chunk ||
        chunk.length > 2000
      )
        throw new Error("Invalid Vault QR part.");
      if (!this.chunks.has(n)) {
        if (this.stored + chunk.length > MAX_RESPONSE_CHARS)
          throw new Error("The Vault answer is too large. Start again.");
        this.stored += chunk.length;
        this.chunks.set(n, chunk);
      }
    } else if (this.chunks.size) throw new Error("Different transfer detected. Start again.");
    return this.collector.add(code);
  }
  get progress() {
    return this.collector.progress;
  }
  clear() {
    this.chunks.clear();
    this.stored = 0;
    this.collector = new PartCollector();
  }
}
