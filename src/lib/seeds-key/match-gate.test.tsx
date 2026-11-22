import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";
import { loadManifest } from "./manifest";
import { walletSignIn } from "./flows";

vi.mock("@/components/SiteFooter", () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("./manifest", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./manifest")>()),
  loadManifest: vi.fn(),
}));
vi.mock("./flows", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./flows")>()),
  hasEvm: () => true,
  walletSignIn: vi.fn(),
}));

const TOKEN = "a".repeat(32);
const requestUrl = `https://seeds.honest.money/api/public/key-signin/manifest/${TOKEN}`;
beforeEach(() => {
  vi.stubGlobal("window", window);
  vi.spyOn(Route, "useSearch").mockReturnValue({ kind: "wallet", r: requestUrl });
  vi.mocked(loadManifest).mockResolvedValue({
    type: "seeds-key-signin",
    version: 1,
    domain: "seeds.honest.money",
    origin: "https://seeds.honest.money",
    app_name: "Seeds Exchange",
    challenge_id: TOKEN,
    challenge: "c".repeat(48),
    pairing_code: "673",
    key_host: window.location.host,
    recipient_pubkey: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
    issued_at: new Date(Date.now() - 1000).toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    submit_url: "https://seeds.honest.money/api/public/key-signin/submit",
    pocket: 1106,
  });
  vi.mocked(walletSignIn).mockResolvedValue({ signedIn: false, needsConfirm: true, pocket: 1106 });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("does not open a provider until the member continues after checking the match code", async () => {
  const Index = Route.options.component as ComponentType;
  render(<Index />);
  await screen.findByRole("button", { name: "Continue" });
  expect(walletSignIn).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(await screen.findByRole("button", { name: /MetaMask/ }));
  await waitFor(() => expect(walletSignIn).toHaveBeenCalledTimes(1));
});

it("rechecks expiration at Continue and does not allow wallet work on an expired request", async () => {
  const m = await vi.mocked(loadManifest)(requestUrl);
  m.expires_at = new Date(Date.now() - 1).toISOString();
  vi.mocked(loadManifest).mockResolvedValue(m);
  const Index = Route.options.component as ComponentType;
  render(<Index />);
  fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
  const walletButton = screen.queryByRole("button", { name: /MetaMask/ });
  if (walletButton)
    await act(async () => {
      fireEvent.click(walletButton);
    });
  expect(walletSignIn).not.toHaveBeenCalled();
});

it("offers Vault only when the manifest contains a signed-request field", async () => {
  vi.spyOn(Route, "useSearch").mockReturnValue({ kind: "coin", r: requestUrl });
  const Index = Route.options.component as ComponentType;
  const view = render(<Index />);
  fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
  expect(screen.queryByRole("button", { name: "Use HME Vault instead" })).toBeNull();
  expect(screen.getByRole("button", { name: "Open camera" })).toBeEnabled();
  view.unmount();
  const m = await vi.mocked(loadManifest)(requestUrl);
  vi.mocked(loadManifest).mockResolvedValue({
    ...m,
    vault_request: { v: 2, request_sig: "invalid-test-signature" },
  });
  render(<Index />);
  fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Use HME Vault instead" }));
  expect(screen.queryByRole("button", { name: /Scan the Vault/ })).toBeNull();
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
