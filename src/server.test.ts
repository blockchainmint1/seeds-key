import { afterEach, describe, expect, it, vi } from "vitest";
import { LIVE_KEY_ORIGIN } from "./lib/seeds-key/policy";

const { handler } = vi.hoisted(() => ({ handler: vi.fn() }));
vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: handler } }));
vi.mock("./lib/error-capture", () => ({ consumeLastCapturedError: () => null }));
import server from "./server";

afterEach(() => { handler.mockReset(); vi.restoreAllMocks(); });

describe("server entry nonce and error coverage", () => {
  it("overwrites caller-controlled nonce headers and binds CSP to the generated nonce", async () => {
    handler.mockImplementation(async (request: Request) => new Response(request.headers.get("x-seeds-key-script-nonce"), { headers: { "content-type": "text/html" } }));
    const response = await server.fetch(new Request(LIVE_KEY_ORIGIN, { headers: { "x-seeds-key-script-nonce": "attacker" } }), undefined, undefined);
    const nonce = await response.text();
    expect(nonce).not.toBe("attacker"); expect(atob(nonce).length).toBe(16);
    expect(response.headers.get("content-security-policy")).toContain(`'nonce-${nonce}'`);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("preserves POST bodies and uses separate nonces for concurrent requests", async () => {
    handler.mockImplementation(async (request: Request) => Response.json({ body: await request.text(), nonce: request.headers.get("x-seeds-key-script-nonce") }));
    const responses = await Promise.all(["first", "second"].map((body) => server.fetch(new Request(LIVE_KEY_ORIGIN, { method: "POST", body }), undefined, undefined)));
    const values = await Promise.all(responses.map((response) => response.json())) as { body: string; nonce: string }[];
    const first = values[0], second = values[1];
    if (!first || !second) throw new Error("Missing response.");
    expect(first.body).toBe("first"); expect(second.body).toBe("second"); expect(first.nonce).not.toBe(second.nonce);
  });
  it("adds the same protections when the handler throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    handler.mockRejectedValue(new Error("synthetic failure"));
    const response = await server.fetch(new Request(LIVE_KEY_ORIGIN), undefined, undefined);
    expect(response.status).toBe(500);
    expect(response.headers.get("content-security-policy")).toContain("script-src 'nonce-");
    expect(response.headers.get("content-security-policy")).toContain("'strict-dynamic'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
  it("covers swallowed SSR errors without exposing their internal response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    handler.mockResolvedValue(Response.json({ unhandled: true, message: "HTTPError" }, { status: 500 }));
    const response = await server.fetch(new Request(LIVE_KEY_ORIGIN), undefined, undefined);
    expect(response.status).toBe(500); expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-security-policy")).toContain("object-src 'none'");
  });
});