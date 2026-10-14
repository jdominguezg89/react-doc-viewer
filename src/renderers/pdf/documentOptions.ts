import type { PdfDocumentOptions } from "../../models";
import { BundledBinaryDataFactory } from "./binaryData";

/**
 * The options handed to pdf.js `getDocument`.
 *
 * By default the JBIG2 / JPEG 2000 decoders come from the package (see
 * binaryData.ts). A consumer who hosts the pdf.js files themselves (`wasmUrl`)
 * or brings their own factory / `useWorkerFetch` gets exactly what they
 * configured, including pdf.js's own fetching from inside the worker.
 */
export const resolvePdfDocumentOptions = (
  options?: PdfDocumentOptions,
): PdfDocumentOptions => {
  if (
    options?.wasmUrl ||
    options?.BinaryDataFactory ||
    options?.useWorkerFetch !== undefined
  ) {
    return options;
  }
  return { ...options, BinaryDataFactory: BundledBinaryDataFactory };
};
