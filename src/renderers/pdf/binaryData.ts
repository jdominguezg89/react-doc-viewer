/**
 * Serves pdf.js its support files without a CDN.
 *
 * pdf.js 5+ decodes JBIG2 and JPEG 2000 images (the compression of most
 * scanned PDFs) with WebAssembly modules it fetches at run time from
 * `wasmUrl`. Instead of asking every consumer to host those files, the
 * package ships them next to its chunks, exactly like the worker: the
 * published build rewrites the `new URL("pdfjs-dist/...", import.meta.url)`
 * expressions below to `new URL("./<file>", import.meta.url)` (see
 * vite.config.ts), which bundlers turn into local static assets.
 *
 * pdf.js asks for the files through the `BinaryDataFactory` option
 * (`useWorkerFetch` is then off and the worker proxies the requests to the
 * main thread). CMaps and the standard fonts are still opt-in through
 * `cMapUrl` / `standardFontDataUrl`, as in pdf.js itself.
 */

type BinaryDataKind = "cMapUrl" | "standardFontDataUrl" | "wasmUrl";

interface BinaryDataFactoryOptions {
  cMapUrl?: string | null;
  standardFontDataUrl?: string | null;
  wasmUrl?: string | null;
}

/** The pdf.js wasm decoders shipped with the package, by pdf.js file name. */
export const bundledPdfjsWasm: Readonly<Record<string, URL>> = {
  "jbig2.wasm": new URL("pdfjs-dist/wasm/jbig2.wasm", import.meta.url),
  "openjpeg.wasm": new URL("pdfjs-dist/wasm/openjpeg.wasm", import.meta.url),
};

/**
 * A pdf.js `BinaryDataFactory`: the bundled wasm decoders for `wasmUrl`
 * requests, the configured base URL for everything else.
 */
export class BundledBinaryDataFactory {
  readonly #baseUrls: BinaryDataFactoryOptions;

  constructor(options: BinaryDataFactoryOptions = {}) {
    this.#baseUrls = options;
  }

  async fetch({
    kind,
    filename,
  }: {
    kind: BinaryDataKind;
    filename: string;
  }): Promise<Uint8Array> {
    const bundled = kind === "wasmUrl" ? bundledPdfjsWasm[filename] : undefined;
    const base = this.#baseUrls[kind];
    const url = bundled?.href ?? (base ? `${base}${filename}` : null);
    if (!url) {
      throw new Error(`Ensure that the \`${kind}\` API parameter is provided.`);
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Unable to load ${kind} data at: ${url} (HTTP ${response.status})`,
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }
}
