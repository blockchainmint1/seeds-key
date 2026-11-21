// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";
import { ledgerBrowserAliases } from "./src/lib/seeds-key/ledger-browser-aliases";

const browserAliases = ledgerBrowserAliases(fileURLToPath(new URL("./node_modules/", import.meta.url)));

export default defineConfig({
  vite: {
    plugins: [{
      name: "ledger-browser-support", enforce: "pre",
      config(config) {
        config.resolve ??= {};
        const existing = config.resolve.alias;
        config.resolve.alias = [...browserAliases, ...(Array.isArray(existing) ? existing : Object.entries(existing ?? {}).map(([find, replacement]) => ({ find, replacement })))];
      },
      // Nitro adds node:* aliases later in config hooks, including buffer/index.js.
      // Restore browser replacements after that merge, for both global and client resolution.
      configResolved: {
        order: "post",
        handler(config) {
          config.resolve.alias.unshift(...browserAliases);
          const clientResolve = config.environments["client"]?.resolve as { alias?: typeof config.resolve.alias } | undefined;
          const clientAliases = clientResolve?.alias;
          if (clientAliases && clientAliases !== config.resolve.alias) clientAliases.unshift(...browserAliases);
        },
      },
    }],
    optimizeDeps: { include: ["buffer/index.js", "events", "@ledgerhq/hw-app-eth", "@ledgerhq/hw-transport-webhid", "@ledgerhq/hw-transport-web-ble"] },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
