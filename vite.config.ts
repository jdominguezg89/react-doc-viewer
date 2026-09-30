import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/**
 * Every runtime dependency and peer dependency is left external so consumers
 * get a single copy of react-pdf / pdfjs-dist / styled-components resolved by
 * their own bundler. CSS from those packages is still inlined into
 * dist/index.css.
 */
const externalPackages = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

const isExternal = (id: string) =>
  !id.endsWith(".css") &&
  externalPackages.some((name) => id === name || id.startsWith(`${name}/`));

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.tsx",
      formats: ["es"],
      fileName: () => "index.js",
    },
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      external: isExternal,
      onwarn(warning, warn) {
        // Rollup strips module-level directives; we re-add "use client" as a
        // banner, so the warning is noise.
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        if (warning.code === "SOURCEMAP_ERROR") return;
        warn(warning);
      },
      output: {
        exports: "named",
        // Keep the React Server Components boundary that Rollup strips.
        banner: '"use client";',
        assetFileNames: (asset) =>
          asset.name === "style.css" ? "index.css" : "[name][extname]",
      },
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
