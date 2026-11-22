import { describe, expect, it } from "vitest";
import { newScriptNonce, securityPolicy, withSecurityHeaders } from "./security-headers";
import { KEY_PREVIEW_ORIGIN, LIVE_KEY_ORIGIN, SEEDS_ORIGIN, SEEDS_PREVIEW_ORIGIN } from "./policy";

describe("security header boundaries", () => {
  it("creates a different 128-bit nonce for every request", () => {
    const a = newScriptNonce(),
      b = newScriptNonce();
    expect(atob(a).length).toBe(16);
    expect(atob(b).length).toBe(16);
    expect(a).not.toBe(b);
  });
  it("permits nonced scripts but not unrestricted inline scripts or preview connections in production", () => {
    const nonce = newScriptNonce(),
      csp = securityPolicy(LIVE_KEY_ORIGIN, nonce);
    expect(csp.split("; ").find((part) => part.startsWith("script-src"))).toBe(
      `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'`,
    );
    expect(csp).toContain(`connect-src 'self' ${SEEDS_ORIGIN}`);
    expect(csp).not.toContain(SEEDS_PREVIEW_ORIGIN);
  });
  it("blocks hosting-injected scripts that lack the per-request nonce", () => {
    // The live edge injects an un-nonced same-origin analytics tag. With strict-dynamic,
    // supporting browsers ignore 'self', so only our nonced entry and its imports run.
    const csp = securityPolicy(LIVE_KEY_ORIGIN, newScriptNonce());
    const scriptSrc = csp.split("; ").find((part) => part.startsWith("script-src")) ?? "";
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc.indexOf("'nonce-")).toBeLessThan(scriptSrc.indexOf("'self'"));
  });
  it("rejects nonce text that could add an attacker script source", () => {
    expect(() => securityPolicy(LIVE_KEY_ORIGIN, "' https://evil.com")).toThrow();
  });
  it("blocks objects, nested frames and base changes without disabling camera access", () => {
    const r = withSecurityHeaders(
      new Request(LIVE_KEY_ORIGIN),
      new Response("ok"),
      newScriptNonce(),
    );
    const csp = r.headers.get("content-security-policy");
    for (const rule of [
      "object-src 'none'",
      "frame-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ])
      expect(csp).toContain(rule);
    expect(r.headers.get("permissions-policy")).toBe(
      "camera=(self), microphone=(), geolocation=()",
    );
    expect(r.headers.get("x-frame-options")).toBe("DENY");
  });
  it("covers error responses and the published alias, not only the custom host", () => {
    for (const origin of [
      LIVE_KEY_ORIGIN,
      "https://seeds-key.lovable.app",
      "https://unexpected.lovable.app",
    ]) {
      const r = withSecurityHeaders(
        new Request(origin),
        new Response("error", { status: 500, headers: { "content-type": "text/html" } }),
        newScriptNonce(),
      );
      expect(r.status).toBe(500);
      expect(r.headers.get("content-security-policy")).toContain("script-src");
      expect(r.headers.get("referrer-policy")).toBe("no-referrer");
      expect(r.headers.get("cache-control")).toBe("no-store");
    }
  });
  it("keeps only designated previews frameable while preserving basic headers", () => {
    for (const origin of [KEY_PREVIEW_ORIGIN, "http://localhost:8080"]) {
      const r = withSecurityHeaders(new Request(origin), new Response("ok"), newScriptNonce());
      expect(r.headers.has("content-security-policy")).toBe(false);
      expect(r.headers.has("x-frame-options")).toBe(false);
      expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });
  it("does not introduce host redirects, opener isolation or broad HSTS commitments", () => {
    const r = withSecurityHeaders(
      new Request(LIVE_KEY_ORIGIN),
      new Response("ok"),
      newScriptNonce(),
    );
    for (const header of ["location", "cross-origin-opener-policy", "strict-transport-security"])
      expect(r.headers.has(header)).toBe(false);
  });
});
