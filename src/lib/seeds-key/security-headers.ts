import { isKeyPreview, seedsOrigins } from "./policy";

export function newScriptNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function securityPolicy(keyOrigin: string, nonce: string): string {
  if (!/^[A-Za-z0-9+/]{22}==$/.test(nonce)) throw new Error("Invalid script nonce.");
  return [
    "default-src 'self'",
    // strict-dynamic: only our nonced entry script (and what it imports, including the
    // lazily loaded Ledger chunks) may run. Hosting-injected scripts without the nonce —
    // e.g. the platform analytics tag — are blocked even though they are same-origin.
    // 'self' remains as the fallback for browsers without strict-dynamic support.
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${seedsOrigins(keyOrigin).join(" ")}`,
    "font-src 'self'",
    "img-src 'self' data:",
    "media-src 'self' blob: mediastream:",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function withSecurityHeaders(request: Request, response: Response, nonce: string): Response {
  const origin = new URL(request.url).origin;
  const secured = new Response(response.body, response);
  secured.headers.set("referrer-policy", "no-referrer");
  secured.headers.set("x-content-type-options", "nosniff");
  secured.headers.set("permissions-policy", "camera=(self), microphone=(), geolocation=()");
  // Editor framing and its injected development scripts are allowed only on known previews.
  if (!isKeyPreview(origin)) {
    secured.headers.set("content-security-policy", securityPolicy(origin, nonce));
    secured.headers.set("x-frame-options", "DENY");
  }
  if (secured.headers.get("content-type")?.includes("text/html")) {
    secured.headers.set("cache-control", "no-store");
  }
  return secured;
}