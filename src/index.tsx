import DocViewer from "./DocViewer";

export default DocViewer;
export type { DocViewerProps } from "./DocViewer";
export { type AvailableLanguages, supportedLanguages } from "./i18n";
export * from "./models";
export * from "./renderers";
export {
  configurePdfWorker,
  getDefaultPdfWorkerSource,
  type PdfWorkerSource,
} from "./renderers/pdf/worker";
export type { IMainState } from "./store/mainStateReducer";
export {
  arrayBufferFileLoader,
  binaryStringFileLoader,
  dataURLFileLoader,
  defaultFileLoader,
  type FileLoaderComplete,
  type FileLoaderFuncProps,
  type FileLoaderFunction,
  type FileLoaderResult,
  textFileLoader,
} from "./utils/fileLoaders";
