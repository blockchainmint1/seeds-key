/** Public deployment identities, never key-derivation inputs. */
export const LIVE_KEY_ORIGIN = "https://key.seeds.honest.money";
export const KEY_PREVIEW_ORIGIN =
  "https://id-preview--73bea008-b73f-48d4-9f72-8c26ed9d32ff.lovable.app";
export const SEEDS_ORIGIN = "https://seeds.honest.money";
export const SEEDS_PREVIEW_ORIGIN =
  "https://id-preview--0ce4bcf5-5883-4de0-96d3-b161585d1bf4.lovable.app";

export const LOCAL_DEV_ORIGIN = "http://localhost:8080";

/** Localhost is trusted only in development builds, never in production bundles. */
export function isKeyPreview(origin: string, dev: boolean = import.meta.env.DEV): boolean {
  return origin === KEY_PREVIEW_ORIGIN || (dev && origin === LOCAL_DEV_ORIGIN);
}

/** Designated previews are isolated from production; unknown hosts are production-only. */
export function seedsOrigins(keyOrigin: string): readonly string[] {
  return isKeyPreview(keyOrigin) ? [SEEDS_PREVIEW_ORIGIN] : [SEEDS_ORIGIN];
}

export function currentKeyOrigin(): string {
  return typeof window === "undefined" ? LIVE_KEY_ORIGIN : window.location.origin;
}
