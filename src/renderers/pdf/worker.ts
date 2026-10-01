/**
 * pdf.js worker configuration.
 *
 * This module must stay free of `react-pdf` / `pdfjs-dist` imports: it is part
 * of the package entry, and pdf.js touches `document` at import time, which
 * would break server-side rendering. The lazily loaded PDF renderer applies
 * the configured source to `pdfjs.GlobalWorkerOptions` in the browser.
 */

export type PdfWorkerSource = string | URL;

/**
 * The worker of the exact `pdfjs-dist` version react-pdf depends on.
 * The published build ships a copy next to its chunks and rewrites this
 * expression to `new URL("./pdf.worker.min.mjs", import.meta.url)` (see
 * vite.config.ts), which every bundler turns into a local asset: no CDN, and
 * the worker always matches the pdf.js version in use.
 */
export const getDefaultPdfWorkerSource = (): string =>
  new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

let configuredSource: string | undefined;

/**
 * Sets the pdf.js worker for every DocViewer instance.
 * Call it once, before the first PDF renders, when the default cannot be used
 * (for example a strict CSP, an offline deployment or a custom CDN).
 *
 * ```ts
 * configurePdfWorker("/static/pdf.worker.min.mjs");
 * ```
 *
 * Calling it without an argument restores the bundled `pdfjs-dist` worker.
 */
export const configurePdfWorker = (source?: PdfWorkerSource): void => {
  configuredSource = source ? String(source) : undefined;
};

/** Resolves the worker source: per-instance override, global setting, default. */
export const resolvePdfWorkerSource = (override?: PdfWorkerSource): string =>
  override
    ? String(override)
    : (configuredSource ?? getDefaultPdfWorkerSource());
