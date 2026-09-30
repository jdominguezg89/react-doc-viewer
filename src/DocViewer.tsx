import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./styles.css";
import { type CSSProperties, forwardRef, memo } from "react";
import { HeaderBar } from "./components/HeaderBar";
import { ProxyRenderer } from "./components/ProxyRenderer";
import { type AvailableLanguages, rtlLanguages } from "./i18n";
import type {
  DocRenderer,
  DocViewerRef,
  IConfig,
  IDocument,
  ITheme,
} from "./models";
import { DocViewerRenderers } from "./renderers";
import { DocViewerProvider } from "./store/DocViewerProvider";
import { cx } from "./utils/cx";

export interface DocViewerProps {
  documents: IDocument[];
  className?: string;
  style?: CSSProperties;
  config?: IConfig;
  theme?: ITheme;
  pluginRenderers?: DocRenderer[];
  prefetchMethod?: string;
  requestHeaders?: Record<string, string>;
  /** Extra `fetch` options used for every document request (credentials, mode, cache, ...). */
  requestInit?: Omit<RequestInit, "signal" | "headers" | "method" | "body">;
  initialActiveDocument?: IDocument;
  language?: AvailableLanguages;
  activeDocument?: IDocument;
  onDocumentChange?: (document: IDocument) => void;
  /** Called once a document's data has been loaded and a renderer is about to show it. */
  onDocumentLoad?: (document: IDocument) => void;
  /** Called when a document fails to load. The viewer also shows an error state. */
  onError?: (error: Error, document?: IDocument) => void;
}

const themeVariables: Array<[keyof ITheme, string]> = [
  ["primary", "--rdv-primary"],
  ["secondary", "--rdv-secondary"],
  ["tertiary", "--rdv-tertiary"],
  ["textPrimary", "--rdv-text-primary"],
  ["textSecondary", "--rdv-text-secondary"],
  ["textTertiary", "--rdv-text-tertiary"],
];

/** Maps the `theme` prop onto CSS custom properties consumed by styles.css. */
const themeToStyle = (theme: ITheme | undefined): CSSProperties => {
  const style: Record<string, string> = {};
  for (const [key, variable] of themeVariables) {
    const value = theme?.[key];
    if (typeof value === "string") style[variable] = value;
  }
  return style as CSSProperties;
};

const DocViewer = forwardRef<DocViewerRef, DocViewerProps>((props, ref) => {
  const { documents, theme, language } = props;

  if (!documents) {
    throw new Error("Please provide an array of documents to DocViewer!");
  }

  return (
    <DocViewerProvider
      ref={ref}
      pluginRenderers={DocViewerRenderers}
      {...props}
    >
      <div
        id="react-doc-viewer"
        data-testid="react-doc-viewer"
        data-themed-scrollbar={theme?.disableThemeScrollbar ? "false" : "true"}
        dir={language && rtlLanguages.includes(language) ? "rtl" : undefined}
        className={cx("rdv", props.className)}
        style={{ ...themeToStyle(theme), ...props.style }}
      >
        <HeaderBar />
        <ProxyRenderer />
      </div>
    </DocViewerProvider>
  );
});

export default memo(DocViewer);
