/** Match SDK imports and our explicit browser Buffer entry before Vite's built-in externalisation. */
export function ledgerBrowserAliases(nodeModules: string) {
  const root = nodeModules.replace(/\/$/, "");
  return [
    { find: /^(?:node:)?buffer(?:\/index\.js|\/)?$/, replacement: `${root}/buffer/index.js` },
    { find: /^(?:node:)?events(?:\/events\.js|\/)?$/, replacement: `${root}/events/events.js` },
  ];
}