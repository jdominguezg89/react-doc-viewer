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

/**
 * pdf.js files the package ships next to its chunks: the worker and the wasm
 * image decoders. The source refers to each one through the `pdfjs-dist`
 * package (`new URL("pdfjs-dist/<path>", import.meta.url)`), which is what
 * Vite needs for dev, tests and Storybook.
 */
const SHIPPED_PDFJS_FILES = [
  "build/pdf.worker.min.mjs",
  "wasm/jbig2.wasm",
  "wasm/openjpeg.wasm",
].map((path) => {
  const file = path.slice(path.lastIndexOf("/") + 1);
  return {
    specifier: `pdfjs-dist/${path}`,
    file,
    sourceLiteral: `new URL("pdfjs-dist/${path}", import.meta.url)`,
    distLiteral: `new URL("./${file}", import.meta.url)`,
    placeholder: `__RDV_PDFJS_${file.replace(/\W/g, "_").toUpperCase()}__`,
  };
});

/**
 * Library build only. A published package cannot keep the `pdfjs-dist`
 * specifier inside `new URL()`: Vite's dependency optimizer in a consumer's
 * dev server rewrites it to a path that does not exist, and library mode
 * would inline the 1 MB worker as a data: URL. So the build copies each file
 * next to the chunks and points the emitted code at it with a plain relative
 * URL, which Vite 8, webpack 5, Turbopack, Parcel and Rollup resolve the same
 * way. (The esbuild-based optimizer of Vite 6/7 dev servers does not; the
 * README documents the workaround.)
 */
const shipPdfjsFiles = (): Plugin => ({
  name: "rdv:ship-pdfjs-files",
  // Not for app builds that reuse this config (Storybook strips `build.lib`).
  apply: (config, env) => env.command === "build" && Boolean(config.build?.lib),
  enforce: "pre",
  transform(code, id) {
    if (!/[\\/]renderers[\\/]pdf[\\/]/.test(id)) return null;
    let next = code;
    for (const { sourceLiteral, placeholder } of SHIPPED_PDFJS_FILES) {
      next = next.replaceAll(sourceLiteral, placeholder);
    }
    return next === code ? null : { code: next, map: null };
  },
  renderChunk(code) {
    let next = code;
    for (const { placeholder, distLiteral } of SHIPPED_PDFJS_FILES) {
      next = next.replaceAll(placeholder, distLiteral);
    }
    return next === code ? null : { code: next, map: null };
  },
  generateBundle() {
    for (const { specifier, file } of SHIPPED_PDFJS_FILES) {
      this.emitFile({
        type: "asset",
        fileName: file,
        source: readFileSync(require.resolve(specifier)),
      });
    }
  },
});

export default defineConfig({
  plugins: [shipPdfjsFiles()],
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
      output: {
        exports: "named",
        // The package is a client boundary for React Server Components: every
        // emitted chunk starts with the directive.
        banner: '"use client";',
        chunkFileNames: "[name]-[hash].js",
      },
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    environmentOptions: {
      // Do not fetch iframe sources (the Office viewer URL) during tests.
      happyDOM: { settings: { disableIframePageLoading: true } },
    },
    setupFiles: ["./vitest.setup.ts"],
  },
});
