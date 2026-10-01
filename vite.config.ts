import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

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

const WORKER_SOURCE_LITERAL =
  'new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)';
const WORKER_DIST_FILE = "pdf.worker.min.mjs";
const WORKER_DIST_LITERAL = `new URL("./${WORKER_DIST_FILE}", import.meta.url)`;
const WORKER_URL_PLACEHOLDER = "__RDV_PDF_WORKER_URL__";

/**
 * Library build only. The source refers to the worker through the
 * `pdfjs-dist` package, which is what Vite needs for dev, tests and Storybook.
 * A published package cannot keep that form: Vite's dependency optimizer in a
 * consumer's dev server rewrites a bare specifier inside `new URL()` to a
 * path that does not exist, and library mode would inline the 1 MB worker as
 * a data: URL. So the build ships the worker next to the chunks and points
 * the emitted code at it with a plain relative URL, which every bundler
 * (Vite dev/build, webpack 5, Turbopack, Parcel, Rollup) resolves the same
 * way.
 */
const shipPdfWorker = (): Plugin => ({
  name: "rdv:ship-pdf-worker",
  // Not for app builds that reuse this config (Storybook strips `build.lib`).
  apply: (config, env) => env.command === "build" && Boolean(config.build?.lib),
  enforce: "pre",
  transform(code, id) {
    if (!/[\\/]renderers[\\/]pdf[\\/]worker\./.test(id)) return null;
    if (!code.includes(WORKER_SOURCE_LITERAL)) return null;
    return {
      code: code.replaceAll(WORKER_SOURCE_LITERAL, WORKER_URL_PLACEHOLDER),
      map: null,
    };
  },
  renderChunk(code) {
    if (!code.includes(WORKER_URL_PLACEHOLDER)) return null;
    return {
      code: code.replaceAll(WORKER_URL_PLACEHOLDER, WORKER_DIST_LITERAL),
      map: null,
    };
  },
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: WORKER_DIST_FILE,
      source: readFileSync(
        require.resolve("pdfjs-dist/build/pdf.worker.min.mjs"),
      ),
    });
  },
});

export default defineConfig({
  plugins: [shipPdfWorker()],
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
