import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/**
 * Every runtime dependency and peer dependency is left external so consumers
 * get a single copy of react-pdf / pdfjs-dist resolved by their own bundler.
 * CSS from those packages is still inlined into dist/index.css.
 */
const externalPackages = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

const isExternal = (id: string) =>
  !id.endsWith(".css") &&
  externalPackages.some((name) => id === name || id.startsWith(`${name}/`));

const WORKER_URL_LITERAL =
  'new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)';
const WORKER_URL_PLACEHOLDER = "__RDV_PDF_WORKER_URL__";

/**
 * In library mode Vite inlines every asset referenced through
 * `new URL(..., import.meta.url)` as a base64 data: URL, which would embed the
 * 1 MB pdf.js worker into dist/index.js. This plugin hides the expression from
 * Vite during the build and restores the literal in the emitted chunk so the
 * *consumer's* bundler resolves the worker from its own node_modules.
 */
const preservePdfWorkerUrl = (): Plugin => ({
  name: "rdv:preserve-pdf-worker-url",
  apply: "build",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes("/renderers/pdf/worker.")) return null;
    if (!code.includes(WORKER_URL_LITERAL)) return null;
    return {
      code: code.replaceAll(WORKER_URL_LITERAL, WORKER_URL_PLACEHOLDER),
      map: null,
    };
  },
  renderChunk(code) {
    if (!code.includes(WORKER_URL_PLACEHOLDER)) return null;
    return {
      code: code.replaceAll(WORKER_URL_PLACEHOLDER, WORKER_URL_LITERAL),
      map: null,
    };
  },
});

export default defineConfig({
  plugins: [preservePdfWorkerUrl()],
  build: {
    lib: {
      entry: "./src/index.tsx",
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "index",
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
        chunkFileNames: "[name]-[hash].js",
      },
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
