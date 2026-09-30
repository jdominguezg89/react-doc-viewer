import type { ComponentType, FC, PropsWithChildren, ReactElement } from "react";
import type { DocumentProps } from "react-pdf";
import type { IMainState } from "./store/mainStateReducer";
import type { FileLoaderFunction } from "./utils/fileLoaders";

export interface IConfig {
  header?: IHeaderConfig;
  loadingRenderer?: ILoadingRendererConfig;
  noRenderer?: INoRendererConfig;
  errorRenderer?: IErrorRendererConfig;
  csvDelimiter?: string;
  pdfZoom?: IPdfZoomConfig;
  pdfVerticalScrollByDefault?: boolean;
  pdf?: IPdfConfig;
  html?: IHtmlConfig;
  msdoc?: IMsDocConfig;
  fetch?: IFetchConfig;
}

export interface IHtmlConfig {
  /**
   * Value of the iframe `sandbox` attribute used to display HTML documents.
   * Defaults to `""` (fully sandboxed: no scripts, opaque origin).
   * Previous releases used `"allow-same-origin"`, which gives the document
   * the host application's origin; opt back in only for trusted content.
   */
  sandbox?: string;
}

export interface IMsDocConfig {
  /**
   * Office documents are displayed through Microsoft's online viewer, which
   * receives the document URL. Set to `false` to show a download link
   * instead (for private or pre-signed URLs).
   */
  enabled?: boolean;
  /** Viewer endpoint; the encoded document URL is appended as `src`. */
  viewerUrl?: string;
}

export type RequestHeadersPolicy =
  | "all"
  | "same-origin"
  | string[]
  | ((uri: string) => boolean);

export interface IFetchConfig {
  /**
   * Which document URLs receive the `requestHeaders` prop.
   * `"all"` (default, previous behaviour), `"same-origin"`, a list of
   * allowed origins, or a predicate. Use it to keep credentials from
   * leaking to third-party hosts.
   */
  sendRequestHeadersTo?: RequestHeadersPolicy;
}

export type PdfDocumentOptions = NonNullable<DocumentProps["options"]>;

export interface IPdfConfig {
  /**
   * Where to load the pdf.js worker from. Defaults to the worker bundled with
   * the `pdfjs-dist` package. Accepts a URL string or `URL`; use
   * `configurePdfWorker()` to set it globally instead.
   */
  workerSrc?: string | URL;
  /**
   * Extra options passed to pdf.js `getDocument` (for example `cMapUrl`,
   * `standardFontDataUrl`, `wasmUrl`, `httpHeaders`, `withCredentials`).
   * Keep the object reference stable to avoid reloading the document.
   */
  documentOptions?: PdfDocumentOptions;
  /** Target for links inside the PDF. Defaults to `_blank`. */
  externalLinkTarget?: "_self" | "_blank" | "_parent" | "_top";
  /** Called when pdf.js fails to load the document. */
  onLoadError?: (error: Error) => void;
}

export interface ILoadingRendererConfig {
  overrideComponent?: ComponentType<{
    document: IDocument | undefined;
    fileName: string;
  }>;
  showLoadingTimeout?: false | number;
}

export interface IErrorRendererConfig {
  overrideComponent?: ComponentType<{
    document: IDocument | undefined;
    fileName: string;
    error: Error;
  }>;
}

export interface INoRendererConfig {
  overrideComponent?: ComponentType<{
    document: IDocument | undefined;
    fileName: string;
  }>;
}

export interface IHeaderConfig {
  disableHeader?: boolean;
  disableFileName?: boolean;
  retainURLParams?: boolean;
  overrideComponent?: IHeaderOverride;
}

export interface IPdfZoomConfig {
  defaultZoom?: number;
  zoomJump?: number;
}

export type IHeaderOverride = (
  state: IMainState,
  previousDocument: () => void,
  nextDocument: () => void,
) => ReactElement | null;

export interface ITheme {
  primary?: string;
  secondary?: string;
  tertiary?: string;
  textPrimary?: string;
  textSecondary?: string;
  textTertiary?: string;
  disableThemeScrollbar?: boolean;
}

/** @deprecated Styling no longer uses styled-components; kept for type compatibility. */
export interface IStyledProps {
  theme: ITheme;
}

export interface IDocument {
  uri: string;
  fileType?: string;
  fileData?: string | ArrayBuffer;
  fileName?: string;
}

export interface DocRendererProps {
  mainState: IMainState;
  /** Extra class name applied to the renderer root (used by image renderers). */
  className?: string;
}

export interface DocRenderer extends FC<PropsWithChildren<DocRendererProps>> {
  fileTypes: string[];
  weight: number;
  fileLoader?: FileLoaderFunction | null | undefined;
}

export interface DocViewerRef {
  prev: () => void;
  next: () => void;
}
