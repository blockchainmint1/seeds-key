import { expect, it } from "vitest";
import { ledgerBrowserAliases } from "./ledger-browser-aliases";
import { resolve } from "node:path";

it("resolves Ledger browser support imports including the published Buffer subpath", () => {
  const aliases = ledgerBrowserAliases("/project/node_modules/");
  for (const specifier of ["buffer", "buffer/", "buffer/index.js", "node:buffer"]) {
    expect(aliases.find((alias) => alias.find.test(specifier))?.replacement).toBe("/project/node_modules/buffer/index.js");
  }
  for (const specifier of ["events", "events/", "events/events.js", "node:events"]) {
    expect(aliases.find((alias) => alias.find.test(specifier))?.replacement).toBe("/project/node_modules/events/events.js");
  }
  for (const specifier of ["buffer-extra", "events-extra", "crypto", "buffer/unknown.js"]) {
    expect(aliases.find((alias) => alias.find.test(specifier))).toBeUndefined();
  }
});

it("production's final client aliases preserve browser Buffer and events after Nitro merges", async () => {
  const { resolveConfig } = await import("vite");
  // Resolve settings only: never run the application's production build in a test.
  const config = await resolveConfig({ configFile: resolve("vite.config.ts") }, "build");
  const clientResolve = config.environments["client"]?.resolve as { alias?: typeof config.resolve.alias } | undefined;
  const clientAliases = clientResolve?.alias;
  expect(clientAliases).toBeDefined();
  for (const aliases of [config.resolve.alias, clientAliases ?? []]) {
    for (const specifier of ["buffer", "buffer/index.js", "node:buffer", "events", "node:events"]) {
      const found = aliases.find((alias) => typeof alias.find === "string" ? alias.find === specifier : alias.find.test(specifier));
      expect(found?.replacement).toBe(resolve(`node_modules/${specifier.includes("buffer") ? "buffer/index.js" : "events/events.js"}`));
    }
  }
}, 30_000);