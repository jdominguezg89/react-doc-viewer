"use client";

import DocViewer from "./DocViewer";

export default DocViewer;
export { type AvailableLanguages, supportedLanguages } from "./i18n";
export * from "./models";
export * from "./renderers";
export { DocViewerRenderers } from "./renderers";
export {
  configurePdfWorker,
  getDefaultPdfWorkerSource,
  type PdfWorkerSource,
} from "./renderers/pdf/worker";
export * from "./utils/fileLoaders";
