import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VaultFlow } from "./VaultFlow";
import { vaultManifest } from "@/test/vault-fixture";
import {
  vaultRequestText,
  submitVaultHandoff,
  readVaultResponse,
} from "@/lib/seeds-key/vault-link";
import { validateActiveManifest } from "@/lib/seeds-key/manifest";
import jsQR from "jsqr";

vi.mock("@/lib/seeds-key/vault-link", () => ({
  vaultRequestText: vi.fn(),
  submitVaultHandoff: vi.fn(),
  readVaultResponse: vi.fn(),
  vaultSignerName: () => "Coin TEST",
}));
vi.mock("@/lib/seeds-key/manifest", () => ({ validateActiveManifest: vi.fn() }));
vi.mock("qrcode", () => ({ default: { toCanvas: vi.fn().mockResolvedValue(undefined) } }));
vi.mock("jsqr", () => ({ default: vi.fn().mockReturnValue(null) }));
let stop: ReturnType<typeof vi.fn>;
let media: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(vaultRequestText).mockReturnValue("signed-request");
  vi.mocked(validateActiveManifest).mockImplementation((m) => m);
  vi.mocked(jsQR).mockReturnValue(null);
  stop = vi.fn();
  media = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: media },
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(2);
  vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => setTimeout(() => f(0), 16));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("unsigned requests cannot open the camera", () => {
  vi.mocked(vaultRequestText).mockImplementation(() => {
    throw new Error("Unsigned");
  });
  render(<VaultFlow m={vaultManifest()} onDone={vi.fn()} onIdentity={vi.fn()} />);
  expect(media).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Scan the Vault/ })).toBeNull();
});

it("scan timeout releases the camera at two minutes", async () => {
  render(<VaultFlow m={vaultManifest()} onDone={vi.fn()} onIdentity={vi.fn()} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Scan the Vault/ }));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120_000);
  });
  expect(stop).toHaveBeenCalled();
  expect(submitVaultHandoff).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
});

it("expiry ends a scan before the timeout", async () => {
  const m = vaultManifest();
  m.expires_at = new Date(Date.now() + 1000).toISOString();
  render(<VaultFlow m={m} onDone={vi.fn()} onIdentity={vi.fn()} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Scan the Vault/ }));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(stop).toHaveBeenCalled();
  expect(submitVaultHandoff).not.toHaveBeenCalled();
});

it("cancel releases a scanning camera", async () => {
  render(<VaultFlow m={vaultManifest()} onDone={vi.fn()} onIdentity={vi.fn()} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Scan the Vault/ }));
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(stop).toHaveBeenCalled();
  expect(submitVaultHandoff).not.toHaveBeenCalled();
});

it("closes a camera that opens after cancellation", async () => {
  let resolve: ((s: unknown) => void) | undefined;
  media.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(<VaultFlow m={vaultManifest()} onDone={vi.fn()} onIdentity={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Scan the Vault/ }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await act(async () => {
    resolve?.({ getTracks: () => [{ stop }] });
  });
  expect(stop).toHaveBeenCalled();
  expect(submitVaultHandoff).not.toHaveBeenCalled();
});

it("unmount aborts a pending handoff and suppresses late success", async () => {
  vi.mocked(jsQR).mockReturnValue({ data: "{}" } as ReturnType<typeof jsQR>);
  vi.mocked(readVaultResponse).mockReturnValue({
    message: "m",
    signature: "s",
    body: {},
    identity: "id",
  });
  let resolve: ((d: { signedIn: true; pocket: number; newAccount: boolean }) => void) | undefined;
  vi.mocked(submitVaultHandoff).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const done = vi.fn();
  const view = render(<VaultFlow m={vaultManifest()} onDone={done} onIdentity={vi.fn()} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Scan the Vault/ }));
  });
  const signal = vi.mocked(submitVaultHandoff).mock.calls[0]?.[2];
  expect(signal?.aborted).toBe(false);
  expect(stop).toHaveBeenCalled();
  view.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => {
    resolve?.({ signedIn: true, pocket: 1106, newAccount: false });
  });
  expect(done).not.toHaveBeenCalled();
});
